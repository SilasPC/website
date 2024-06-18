#!/bin/python3

import re
from os import listdir, read
from os.path import isfile, join

src_dir="src"
out_dir="out"

x = dict()
def read_srcs(dir):
	for f in listdir(dir):
		path = join(dir, f)
		if not isfile(path):
			read_srcs(path)
			continue
		with open(path) as fd:
			x[f] = fd.read()

cache = dict()
def foo(p):
	if cache.get(p) == 0:
		raise Exception("Cyclical template")
	y = x[p]
	cache[p] = 0
	while True:
		match = next(re.finditer(r"\{\{(.*)\}\}", y), None)
		if match:
			try:
				repl = foo(match.group(1).strip())
				(s,e) = match.span()
				y = y[:s] + repl + y[e:]
			except:
				print(f"... evaluating {p}")
				raise
		else:
			break
	cache[p] = y
	with open(join(out_dir, p), mode="w") as fd:
		fd.write(y)
	return y

for p in x.keys():
	foo(p)