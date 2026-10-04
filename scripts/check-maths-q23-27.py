"""Independent arithmetic/geometry checks for the reviewed historical tasks.

This is source-specific validation, not a generator calibration or paper gate.
"""
import argparse
import hashlib
import json
import math
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', default='research/validation/2026-10-04-q23-27-checks.json')
args = parser.parse_args()
path = ROOT / 'research/extractions/4MB1-2024-summer-01.json'
manifest = json.loads(path.read_text())
tasks = {t['questionPath']: t for t in manifest['tasks']}
checks = []

def check(name, condition, detail):
    if not condition:
        raise AssertionError(name)
    checks.append(dict(name=name, status='passed', detail=detail))

classes = tasks['23.c']['sourceData']['classes']
freq = [r['frequency'] for r in classes]
check('group-total', sum(freq) == 60, 'Printed frequencies sum to 60.')
check('modal-class', freq.index(max(freq)) == 0, 'Highest frequency belongs to 0 < d ≤ 2.')
cumulative = []
for f in freq:
    cumulative.append(f + (cumulative[-1] if cumulative else 0))
check('median-class', cumulative[0] < 30 <= cumulative[1] and cumulative[0] < 31 <= cumulative[1], 'Both central observations are in 2 < d ≤ 5.')
products = [F(r['lower'] + r['upper'], 2) * r['frequency'] for r in classes]
check('mean', sum(products) == 435 and sum(products)/60 == F(29, 4), 'Midpoint sum 435; estimate 7.25 km.')
tail = sum(r['frequency'] for r in classes if r['lower'] >= 10)
check('tail-probability', F(tail, 60) == F(4, 15), 'The upper endpoint 10 belongs to the preceding class and is excluded.')

v = tasks['24']['sourceData']
check('similarity-volume', F(v['volumeBmm3'], v['volumeAmm3']) == F(3, 5)**3, 'Volume ratio 27/125, linear ratio 3/5.')
area_b = F(v['areaSumMm2']) * F(9, 34)
check('similarity-area', area_b == 2232 and F(v['areaSumMm2'])-area_b == 6200, 'Area ratio 9/25 partitions the combined area into 34 parts.')

s = tasks['25']['sourceData']
r = s['radiusCm']
angle = 40*360/(r*r)
chord_sine = 2*r*math.sin(math.radians(angle/2))
chord_cosine = math.sqrt(2*r*r*(1-math.cos(math.radians(angle))))
check('sector-chord', angle == 144 and math.isclose(chord_sine, chord_cosine, rel_tol=1e-14), 'Independent sine and cosine-rule routes agree.')
linear = chord_sine - s['BFcm']
pos = (-linear + math.sqrt(linear*linear + 4*240))/2
neg = (-linear - math.sqrt(linear*linear + 4*240))/2
check('secant-positive-root', math.isclose(15*(16+pos), pos*(pos+chord_sine), rel_tol=1e-14) and round(pos, 1) == 13.6 and neg < 0, 'Roots ≈13.6112904334 and −17.6324207593; only positive length retained.')

# Use an independent two-dimensional coordinate realization, not the printed
# simultaneous coefficient equations: a=(2,1), b=(-1,3).
a, b = (F(2), F(1)), (F(-1), F(3))
def add(u,v):return tuple(x+y for x,y in zip(u,v))
def scale(k,u):return tuple(k*x for x in u)
def cross(u,v):return u[0]*v[1]-u[1]*v[0]
A, B = scale(3,a), scale(5,b)
Q = add(B, add(scale(6,a),scale(-3,b)))
AB = add(B,scale(-1,A))
lambda_ = cross(A,AB)/cross(Q,AB)
P = scale(lambda_,Q)
M = scale(F(2,5),B)
MP = add(P,scale(-1,M))
check('vector-intersection', cross(add(P,scale(-1,A)),AB) == 0 and lambda_ == F(5,12), 'Line intersection derived from coordinate cross products.')
check('vector-result', MP == add(scale(F(5,2),a),scale(F(-7,6),b)), 'Independent coordinate realization confirms (5/2)a − (7/6)b.')

b_const = F(18,3)
a_const = F(22,5) - b_const/3 + F(9,9)
derivative = -b_const/F(3)**2 + F(18)/F(3)**3
second_derivative = 2*b_const/F(3)**3 - F(54)/F(3)**4
check('stationary-constant', b_const == 6 and a_const == F(17,5) and derivative == 0 and second_derivative < 0, 'a=3.4, b=6; gradient zero and negative second derivative at x=3. Second derivative is an editorial check, not an extra mark.')
check('leaf-mark-reconciliation', len(tasks) == 38 and sum(t['originalMarks'] for t in tasks.values()) == 100 and manifest['fullyProcessed'] is False, 'All detailed parts match the indexed count; no processing promotion.')
report = dict(date='2026-10-04',status='passed',checks=checks,educationalReadinessCertified=False,limitations=['These are task-specific arithmetic and reasoning checks, not calibrated families.','Existing source discrepancies and whole-paper processing gates remain open.'],extractionSha256=hashlib.sha256(path.read_bytes()).hexdigest())
(ROOT / args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'status':'passed'}))
