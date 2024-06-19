#!/bin/python3

import re
from pathlib import Path
from os.path import relpath
import yaml
from os import listdir, path
import sys
from os.path import isfile, join
import io
from contextlib import redirect_stdout

class dotdict(dict):
    """dot.notation access to dictionary attributes"""
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

def read_yaml(f):
	with open(f) as f:
		return yaml.safe_load(f)

cfg = read_yaml(sys.argv[1] if len(sys.argv) > 1 else "build.yaml")

out_dir=cfg["out_dir"]
src_dir=cfg["src_dir"]

sources = dict()
def read_srcs(dir):
	for f in listdir(join(src_dir, dir)):
		name = join(dir, f)
		path = join(src_dir, name)
		if not isfile(path):
			read_srcs(name)
			continue
		with open(path) as fd:
			sources[name] = fd.read()
read_srcs("")

def read_file(f):
	with open(f) as f:
		return f.read()

def render(p, **kwargs):
	y = None
	try:
		y = sources[p]
	except:
		raise Exception(f"No such source file {p}")
	while True:
		match = next(re.finditer(r"\{\{(.*)\}\}", y), None)
		if match:
			try:
				output = render(match.group(1).strip())
				(s,e) = match.span()
				y = y[:s] + output + y[e:]
			except:
				print(f"... substituting {p}")
				raise
		else:
			break
	while True:
		match = next(re.finditer(r"\{(!)?(%+)([\s\S]*)\2\}", y), None)
		if match:
			try:
				code = match.group(3).strip()
				data = {
					"render": render,
					"read_file": read_file,
					"read_yaml": read_yaml,
					"this": p,
					"output": "",
					"args": dotdict(kwargs),
				}
				try:
					if match.group(1) == "!":
						exec(code, data)
						output = data["output"]
					else:
						output = eval(code, data)
				except:
					print("evaluation error")
					raise
				(s,e) = match.span()
				y = y[:s] + str(output) + y[e:]
			except:
				print(f"... evaluating {p}")
				raise
		else:
			break
	return y

for p in sources.keys():
	no_render = False
	for exclude in cfg["exclude_render"]:
		if p.startswith(exclude):
			no_render = True
			break
	if no_render: continue
	try:
		res = render(p)
		path = join(out_dir, p)
		Path(path).parent.mkdir(parents=True, exist_ok=True)
		with open(path, mode="w") as fd:
			fd.write(res)
	except Exception as e:
		print(e)
		sys.exit(1)

Path(out_dir, "static").unlink(missing_ok=True)
Path(out_dir, "static").symlink_to(Path("static").absolute(), target_is_directory=True)