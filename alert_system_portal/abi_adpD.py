#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Oct 21 15:32:29 2023

@author: ismart
"""
import os, sys
from glob import glob


from pyproj import Transformer, CRS

from datetime import datetime, timedelta
import pandas as pd
import numpy as np

import grfuns
#%%
sat_no = 16
aws_bucket = f"noaa-goes{sat_no}"

prod = "ABI-L2-ADPC"    ### Aerosol, Smoke, Dust
####### Example 00
# tm_s = datetime(2022,5,8,19,55,55); tm_e = datetime(2022,5,8,21,19,49)## smoke dust Arizona
####### Example 01
# tm_s = datetime(2023, 6, 7, 17, 0); tm_e = datetime(2023, 6,  7, 18, 59) ### NewYork Smoke
####### Example 02
# tm_s = datetime(2021, 9, 1, 16, 0); tm_e = datetime(2021, 9, 1, 17, 59) ### Hurricane Ida
####### Example 03
# tm_s = datetime(2021, 8, 6, 16, 0); tm_e = datetime(2021, 8, 6, 17, 59) ### California wildfire

# tm_s = datetime(2022,6,28,22,16); tm_e = datetime(2022,6,29,0,41)## smoke dust sout US
# tm_s = datetime(2023, 6,  7, 10, 0); tm_e = datetime(2023, 6,  7, 15, 59) ### NewYork
tm_e = datetime.utcnow(); tm_s = tm_e - timedelta(minutes = 180)

#%%
mainpth = os.path.dirname(__file__)
ptho1 = f'{mainpth}/pts_adpD'
if not os.path.isdir(ptho1):
    os.makedirs(ptho1)
    print(f"Se creó: {ptho1}")
else:
    print(f"Existe : {ptho1}")
#%%
matches = grfuns.get_best_times(aws_bucket, prod, tm_s, tm_e)
# id_hr = list(matches.keys())[12]
#%%
for id_hr in matches.keys():
    key = matches[id_hr]
    gdata = grfuns.get_s3_grdata(aws_bucket, key)
    fileout = f'{ptho1}/{id_hr}.csv'
    if not os.path.exists(fileout):
        df = grfuns.adpD2csv(gdata)
        df.to_csv(fileout,index=False)
#%%
lst2del = glob(f'{ptho1}/*.csv')
lst2del.sort()
#%%
tme = []
for n, fl in enumerate(lst2del):
    pd0 = pd.read_csv(fl)
    nme = os.path.basename(fl).split('_')[-1]
    dtt = datetime.strptime(nme,'%Y%j%H%M.csv')
    pd0['time'] = dtt
    tme.append(dtt)
    if n == 0:
        pds = pd0.copy()
    else:
        pds = pd.concat([pds,pd0])
    # if n == 4:
    #     break

#%%
gpd_df = pds.groupby(['lon','lat'])
# gpd_df
ftrs = []
for gp_key, gp_value in gpd_df:
    group = gpd_df.get_group(gp_key)
    group.index = pd.to_datetime(group['time'])
    pdd = group.copy()
    pdd.index = pd.to_datetime(pdd['time'])
    new_dates = pd.to_datetime(tme)
    pdd = pdd.reindex(new_dates).fillna(0)
    
    # ttt = group.iloc[-1]['time']
    # tsec = (pdd.index[-1] - ttt).total_seconds()
    # print(str(pdd.index[-1] - ttt))
    # if tsec == 0:
    ttt = group.iloc[-1]['time']
    mintim = (pdd.index[-1] - ttt)
    minsecs = mintim.total_seconds()
    if minsecs == 0:
        dtp = str(pdd.index[-1] - ttt)
        dtt = dtp.split('days')[1].strip()[:8]
        
        listdst = pdd['Dust'].to_list()        
        lastdst = pdd['Dust'].values[-1]
        
        lai = round(group['lat'].values[-1], 3)
        loi = round(group['lon'].values[-1], 3)
        
        currT = pdd['Dust'].values[-1]
        if lastdst == 0:
            dststat = 'Inactive'
        else:
            dststat = 'Active'
        
        lastac = f"{ttt:%Y-%m-%dT%H:%M:%S}Z"
        # dtp = str(pdd['time'][len(pdd['time'])-1] - ttt)
        dtp = str(mintim)
        dtt = dtp.split('days')[1].strip()[:8]
        
        print(dtt,minsecs)
        time0 = f"{pdd.index[0]:%Y-%m-%dT%H:%M:%S}Z"
        
        str1 = f"""( "type": "Feature", "properties": ( "name": "Dust", "units": "[-]", "Status": "{dststat}", "data": {lastdst} , "time_o": "{dtt}", "time_0": "{time0}", "time": "{lastac}", "lat": {lai}, "lon": {loi}, "serie": {listdst}, "icon_exp": "_", "html_exp": null ), "geometry": ( "type": "Point", "coordinates": [ {loi}, {lai} ] ) ),"""
        ftrs.append(str1)
if not ftrs:
    ftrs = ["""( "type": "Feature", "properties": ( "name": "Dust", "units": "[-]", "Status": null, "data": null , "time_o": null, "time_0": null, "time": null, "lat": 0, "lon": 0, "serie": null, "icon_exp": "_", "html_exp": null ), "geometry": ( "type": "Point", "coordinates": [ 0, 0 ] ) ),"""]
        


#%%
ftrs[-1] = ftrs[-1][:-1]
jsonmd = '\n'.join(ftrs)
strtms = [f"{n:%Y-%m-%dT%H:%M:%S}Z" for n in tme]
jsonf = f"""(
"type": "FeatureCollection",
"name": "Dust [-]",
"crs": ( "type": "name", "properties": ( "name": "urn:ogc:def:crs:OGC:1.3:CRS84" ) ),
"bbox": [ -108.111197, 16.131805, -71.672997, 49.627452 ],    
"times": {strtms},
"features": [
{jsonmd}
]
)"""
jsonf = jsonf.replace("'", '"')
jsonf = jsonf.replace("(", "{")
jsonf = jsonf.replace(")", "}")
#%%
pthg = f'{mainpth}/data_map'
file2up = f'{pthg}/pts_adpD.geojson'
f = open(file2up, 'w')
f.write(jsonf)
f.close()

os.system(f'/home/ismart/Software/miniconda3/envs/pytroll/bin/python "/home/ismart/goesrdatajam/upload_dropbox.py" "{file2up}" ')

for i, fl in enumerate(reversed(lst2del)):
    if i > 30:
        # print(fl)
        os.system(f"/usr/bin/rm -rf {fl}")


