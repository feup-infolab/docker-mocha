#!/usr/bin/env python

import os
import sys
import json
import pprint
import networkx as nx
import matplotlib.pyplot as plt

if(len(sys.argv) < 2):
    print "No tests file specified"
    sys.exit(1)

if(not os.path.exists(sys.argv[1])):
    print "File specified does not exist"
    sys.exit(1)

data = json.load(open(sys.argv[1]))
G = nx.DiGraph()

for test in data:
    fileExists = os.path.exists(os.path.join(os.getcwd(), test["test"]))
    setupExists = False

    if test["setup"] == None:
        setupExists = True
    else:
        setupExists = os.path.exists(os.path.join(os.getcwd(), test["setup"]))

    if  fileExists and setupExists:
        G.add_edge(test["name"], test["parent"])

nx.draw(G, with_labels=True)

plt.show();