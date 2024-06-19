#!/bin/python3


import re
from pathlib import Path
from os.path import relpath
from os import listdir, path
from os.path import isfile, join

src_dir="src"
out_dir="out"

x = dict()
def read_srcs(dir):
	for f in listdir(join(src_dir, dir)):
		name = join(dir, f)
		path = join(src_dir, name)
		if not isfile(path):
			read_srcs(name)
			continue
		with open(path) as fd:
			x[name] = fd.read()
read_srcs("")

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
	path = join(out_dir, p)
	Path(path).parent.mkdir(parents=True, exist_ok=True)
	with open(path, mode="w") as fd:
		fd.write(y)
	return y

for p in x.keys():
	foo(p)