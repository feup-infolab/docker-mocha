#!/usr/bin/env python

import os
import sys
import json
import pprint
import networkx as nx
import matplotlib.pyplot as plt
import math as math

if(len(sys.argv) < 2):
    print "No tests file specified"
    sys.exit(1)

if(not os.path.exists(sys.argv[1])):
    print "File specified does not exist"
    sys.exit(1)

data = json.load(open(sys.argv[1]))
G = nx.DiGraph()

states = data["states"]

for (k,v) in states.items():
    if v["depends_on"] is not None:
        G.add_edge(k, v["depends_on"])

tests = data["tests"]
mapping = {};

for (k, v) in tests.items():
    depedends = tests[k]["state"]
    if depedends in mapping:
        mapping[depedends] = mapping[depedends] + 1
    else:
        mapping[depedends] = 1

mapping2 = {}

for (k, v) in mapping.items():
    mapping2[k] = k + ": " + str(v)

G = nx.relabel_nodes(G, mapping2)        

nx.draw(G, with_labels=True, font_size=12)

plt.show();