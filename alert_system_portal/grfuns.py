#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Oct 21 10:29:20 2023

@author: ismart
"""
from datetime import datetime, timedelta
import boto3
from botocore import UNSIGNED
from botocore.config import Config
import xarray as xr
from io import BytesIO
import pandas as pd
import numpy as np
from pyproj import Transformer, CRS

def get_best_times(aws_bucket, prod, tm_s, tm_e):
    # all_days = [tm_s + timedelta(days=x) for x in range((tm_e - tm_s).days + 2)]
    all_hrs = [tm_s + timedelta(hours = x) for x in range(int((tm_e - tm_s).total_seconds() / 60 / 60) + 1)]
    
    ###################################################################
    ######## inspirated whit Myranda Shirk materials for GOES-R DataJam
    ###################################################################
    s3 = boto3.client('s3', config = Config(signature_version = UNSIGNED))
    
    tmpls01 = []
    for hri in all_hrs:
        prfx = f"{prod}/{hri:%Y/%j/%H}/"
        paginator = s3.get_paginator("list_objects_v2")
        page_iterator = paginator.paginate(Bucket = aws_bucket, Prefix = prfx)
        files_mapper = [f['Key'] for page in page_iterator for f in page["Contents"]]
        tmpls01 += files_mapper
    
    tmpls02 = [file.split('/')[-1].split('_')[3][1:12] + '|' + file for file in tmpls01]
    tmpls02.sort(reverse=True)
    
    tmpdic01 = {dti.split('|')[0]: dti.split('|')[1] for dti in tmpls02}
    ###################################################################
    ######## inspirated whit Amy Huff materials for GOES-R DataJam
    ###################################################################
    matches = {dti:tmpdic01[dti] for dti in tmpdic01.keys() if (dti >= f'{tm_s:%Y%j%H%M}' and dti <= f'{tm_e:%Y%j%H%M}')}
    return matches

def get_s3_grdata(aws_bucket, key):
    s3 = boto3.client('s3', config = Config(signature_version = UNSIGNED))
    obj = s3.get_object(Bucket = aws_bucket, Key = key)
    bdy = obj['Body'].read()
    content = BytesIO(bdy)
    gdata = xr.open_dataset(content, decode_cf = True, mask_and_scale = False, )
    return gdata

def get_geos_mtrx(gdata):
    proj_var    = gdata['goes_imager_projection']
    sat_h       = proj_var.perspective_point_height
    # central_lon = proj_var.longitude_of_projection_origin
    # semi_major  = proj_var.semi_major_axis
    # semi_minor  = proj_var.semi_minor_axis
    # sweep       = proj_var.sweep_angle_axis
    
    _x = gdata['x']
    x_geos = _x * _x.attrs['scale_factor'] + _x.attrs['add_offset']
    x_geos *= sat_h
    
    _y = gdata['y']
    y_geos = _y * _y.attrs['scale_factor'] + _y.attrs['add_offset']
    y_geos *= sat_h
    
    return x_geos, y_geos

def get_geos_proj(gdata):
    proj_var    = gdata['goes_imager_projection']
    sat_h       = proj_var.perspective_point_height
    central_lon = proj_var.longitude_of_projection_origin
    semi_major  = proj_var.semi_major_axis
    semi_minor  = proj_var.semi_minor_axis
    sweep       = proj_var.sweep_angle_axis
    
    proj4 = (f'+proj=geos +lon_0={central_lon} +a={semi_major}'
             f' +b={semi_minor} +h={sat_h} +sweep={sweep} +units=m +no_defs')    
    return proj4

##################### Fire
def adjuts_values(A):
    v1 = [  0,  10,  11, 12,   13,  14,  15,  30,  31,  32,  33,  34, 35,  
           40,  50,  60, 100, 120, 121, 
          123, 124, 125, 126, 127,
          150, 151, 152, 153, 
          170, 180, 182, 185, 186, 187, 188, 
          200, 201, 205, 210, 215, 220, 225, 230, 240, 245]
    # v2 = [7,  1,  2,  3,  4,  5,  6,  1,  2,  3,  4,  5,  6,  
    #       7,  7,  7,  0,  7,  7,  
    #       8,  8,  8,  8,  8,  
    #       9,  9,  9,  9,  
    #       10, 10, 10, 10, 10, 10, 10, 
    #       11, 11, 11, 11, 11, 11, 11, 11, 11, 11]
    v2 = ['nan',  1,  2,  3,  4,  5,  6,  1,  2,  3,  4,  5,  6,  
          'nan', 'nan', 'nan', 'nan', 'nan', 'nan',  
          'nan', 'nan', 'nan', 'nan', 'nan',
          'nan', 'nan', 'nan', 'nan',
          'nan', 'nan', 'nan', 'nan', 'nan', 'nan', 'nan',
          'nan', 'nan', 'nan', 'nan', 'nan', 'nan', 'nan', 'nan', 'nan', 'nan',]
    for i, v1i in enumerate(v1):
        A = A.where(A != v1i, float(v2[i]))
    return A

def get_fdc(gdata):
    ### masking data whit quilyti pixels 
    fdcmask = adjuts_values(gdata['Mask'])
    
    fdctemppre = gdata['Temp']
    factor1 = fdctemppre.attrs['scale_factor']
    offset1 = fdctemppre.attrs['add_offset']
    
    fdctemp = fdctemppre * float(factor1) + offset1
    fdctemp = fdctemp.where(fdctemp < 1500)
    fdctemp = fdctemp.where(fdctemp > 400)
    
    fdcpowr = gdata['Power']
    return fdcmask, fdctemp, fdcpowr

def fdc2csv(gdata):
    fdcmask, fdctemp, fdcpowr = get_fdc(gdata)
    x_geos, y_geos = get_geos_mtrx(gdata)
    xlst, ylst = np.meshgrid(x_geos.data, y_geos.data)
    
    flags = np.hstack((xlst.flatten()[:, np.newaxis],
                       ylst.flatten()[:, np.newaxis],
                       fdcmask.data.flatten()[:, np.newaxis],
                       fdctemp.data.flatten()[:, np.newaxis],
                       fdcpowr.data.flatten()[:, np.newaxis], ) )
    
    firev = pd.DataFrame(flags) 
    firev.columns = ['x_geos', 'y_geos', 'Mask', 'Temp', 'Power']
    df = firev.copy()
    # df['n'] = df['n'].replace(0, float('nan'))
    
    proj4 = get_geos_proj(gdata)
    
    crsp = CRS(proj4)
    proj_wkt1 = crsp.to_wkt(pretty=True)
    crs = CRS.from_wkt(proj_wkt1)        
    proj_wkt = crs.to_wkt()
    #% %
    transformer = Transformer.from_crs(proj_wkt,"epsg:4326") 
    df['lat'], df['lon'] = transformer.transform(df['x_geos'], df['y_geos'],)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df = df.dropna()
    
    df = df.round({'Temp': 2, 'x_geos': 2, 'y_geos': 2,'lon': 6, 'lat': 6})
    # df.to_csv(fileout,index=False)
    return df
##################### Fire - END
##################### smke and dust
def get_adp(gdata):
    ### masking data whit quilyti pixels 
    dust01 = gdata['Dust']
    dustfill = dust01.attrs['_FillValue']
    adpdust = dust01.where(dust01 != dustfill)
    adpdust = adpdust.where(adpdust != 0)

    smke01 = gdata['Smoke']
    smkefill = smke01.attrs['_FillValue']
    adpsmke = smke01.where(smke01 != smkefill)
    adpsmke = adpsmke.where(adpsmke != 0)
    return adpdust, adpsmke

def adpD2csv(gdata):
    adpdust, adpsmke = get_adp(gdata)
    x_geos, y_geos = get_geos_mtrx(gdata)
    xlst, ylst = np.meshgrid(x_geos.data, y_geos.data)
    
    flags = np.hstack((xlst.flatten()[:, np.newaxis],
                       ylst.flatten()[:, np.newaxis],
                       adpdust.data.flatten()[:, np.newaxis],) )
    
    firev = pd.DataFrame(flags) 
    firev.columns = ['x_geos', 'y_geos', 'Dust']
    df = firev.copy()
    # df['n'] = df['n'].replace(0, float('nan'))
    
    proj4 = get_geos_proj(gdata)
    
    crsp = CRS(proj4)
    proj_wkt1 = crsp.to_wkt(pretty=True)
    crs = CRS.from_wkt(proj_wkt1)        
    proj_wkt = crs.to_wkt()
    #% %
    transformer = Transformer.from_crs(proj_wkt,"epsg:4326") 
    df['lat'], df['lon'] = transformer.transform(df['x_geos'], df['y_geos'],)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df = df.dropna()
    
    df = df.round({'x_geos': 2, 'y_geos': 2,'lon': 6, 'lat': 6})
    # df.to_csv(fileout,index=False)
    return df

def adpS2csv(gdata):
    adpdust, adpsmke = get_adp(gdata)
    x_geos, y_geos = get_geos_mtrx(gdata)
    xlst, ylst = np.meshgrid(x_geos.data, y_geos.data)
    
    flags = np.hstack((xlst.flatten()[:, np.newaxis],
                       ylst.flatten()[:, np.newaxis],
                       adpsmke.data.flatten()[:, np.newaxis],) )
    
    firev = pd.DataFrame(flags)
    firev.columns = ['x_geos', 'y_geos', 'Smoke']
    df = firev.copy()
    # df['n'] = df['n'].replace(0, float('nan'))
    
    proj4 = get_geos_proj(gdata)
    
    crsp = CRS(proj4)
    proj_wkt1 = crsp.to_wkt(pretty=True)
    crs = CRS.from_wkt(proj_wkt1)        
    proj_wkt = crs.to_wkt()
    #% %
    transformer = Transformer.from_crs(proj_wkt,"epsg:4326") 
    df['lat'], df['lon'] = transformer.transform(df['x_geos'], df['y_geos'],)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df = df.dropna()
    
    df = df.round({'x_geos': 2, 'y_geos': 2,'lon': 6, 'lat': 6})
    # df.to_csv(fileout,index=False)
    return df
##################### smke and dust
##################### PRecip
def get_rrqpef(gdata):
    gvar0   = gdata['RRQPE']
    dustfill = gvar0.attrs['_FillValue']
    gvar0 = gvar0.where(gvar0 != dustfill)

    x_geos, y_geos = get_geos_mtrx(gdata)
    
    gvar0['x'] = x_geos
    gvar0['y'] = y_geos
    gvar1 = gvar0.sel(y = slice(4545363.2038,2493537.6910), x = slice(-3473141.8855,673255.5050))
    
    factor1 = gvar1.attrs['scale_factor']
    offset1 = gvar1.attrs['add_offset']
    dprec = gvar1 * float(factor1) + offset1
    
    dprec = dprec.where(dprec > 5)
    return dprec

def rrqpef2csv(gdata):
    dprec = get_rrqpef(gdata)
    xlst, ylst = np.meshgrid(dprec['x'].data, dprec['y'].data)
    flags = np.hstack((xlst.flatten()[:, np.newaxis],
                       ylst.flatten()[:, np.newaxis],
                       dprec.data.flatten()[:, np.newaxis], ) )
    firev = pd.DataFrame(flags) 
    firev.columns =['x_geos', 'y_geos', 'RRQPE']
    df = firev.copy()
    
    proj4 = get_geos_proj(gdata)
    
    crsp = CRS(proj4)
    proj_wkt1 = crsp.to_wkt(pretty=True)
    crs = CRS.from_wkt(proj_wkt1)        
    proj_wkt = crs.to_wkt()
    #% %
    transformer = Transformer.from_crs(proj_wkt,"epsg:4326") 
    df['lat'], df['lon'] = transformer.transform(df['x_geos'], df['y_geos'],)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df = df.dropna()
    
    df = df.round({'x_geos': 2, 'y_geos': 2,'lon': 6, 'lat': 6})
    return df











