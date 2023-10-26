#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sun Oct 22 21:07:18 2023

@author: ismart
"""

import os, sys
from glob import glob


from pyproj import Transformer, CRS

from datetime import datetime, timedelta
import pandas as pd
import numpy as np

import grfuns
#% %
sat_no = 16
aws_bucket = f"noaa-goes{sat_no}"

prod = "ABI-L2-CMIPC"    ### fire


####### Example 00
# tm_s = datetime(2022,5,8,19,55,55); tm_e = datetime(2022,5,8,21,19,49)## smoke dust Arizona
####### Example 01
# tm_s = datetime(2023, 6, 7, 17, 0); tm_e = datetime(2023, 6,  7, 18, 59) ### NewYork Smoke
####### Example 02
# tm_s = datetime(2021, 9, 1, 16, 0); tm_e = datetime(2021, 9, 1, 17, 59) ### Hurricane Ida
####### Example 03
tm_s = datetime(2021, 8, 6, 16, 0); tm_e = datetime(2021, 8, 6, 17, 59) ### California wildfire

# tm_s = datetime(2022,6,28,22,16); tm_e = datetime(2022,6,29,0,41)## smoke dust sout US
# tm_s = datetime(2023, 6,  7, 10, 0); tm_e = datetime(2023, 6,  7, 15, 59) ### NewYork
# tm_e = datetime.utcnow(); tm_s = tm_e - timedelta(minutes = 180)


matches = grfuns.get_best_times(aws_bucket, prod, tm_s, tm_e)

# s20182541537131
# s20232960206174

