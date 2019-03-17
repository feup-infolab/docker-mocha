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
    G.add_edge(test["file"], test["setup"])

# mymap = {}
# labels = {}
# iter = 0

# for test in data:
#     if test["file"] not in mymap:
#         mymap[test["file"]] = iter
#         labels[iter] = test["title"]
#         iter += 1

# for test in data:
#     if test["setup"] not in mymap:
#         mymap[test["setup"]] = iter
#         iter += 1
    
#for test in data:


nx.draw(G, with_labels=True)

plt.show();