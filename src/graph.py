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

nx.draw(G, with_labels=True, font_size=8)

plt.show();