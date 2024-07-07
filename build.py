#!/bin/python3

import re
from pathlib import Path
from os.path import relpath
import yaml
from os import listdir, path, system
import sys
from os.path import isfile, join
import io
from contextlib import redirect_stdout

class dotdict(dict):
    """dot.notation access to dictionary attributes"""
    def __getattr__(self, key):
        val = self.get(key)
        if isinstance(val, dict):
            val = dotdict(val)
        return val
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

def read_yaml(f):
	with open(f) as f:
		return dotdict(yaml.safe_load(f))

cfg = read_yaml(sys.argv[1] + ".yaml" if len(sys.argv) > 1 else "build.yaml")

out_dir = Path(cfg["out_dir"])
src_dir = Path(cfg["src_dir"])

def read_dir(dir):
	return [f for f in listdir(join(src_dir, dir)) if isfile(join(src_dir, dir, f))]

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
	with open(join(src_dir,f)) as f:
		return f.read()

def render(p, **kwargs):
	y = None
	try:
		y = sources[p]
	except:
		raise Exception(f"No such source file '{p}'")
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
		match = next(re.finditer(r"\{(!)?(%+)([\s\S]*?)\2\}", y), None)
		if match:
			try:
				code = match.group(3).strip()
				data = {
					"render": render,
					"read_file": read_file,
					"read_yaml": read_yaml,
					"read_dir": read_dir,
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
					print("evaluation error:")
					if "dump_file" in cfg:
						dump = Path(cfg["dump_file"])
						if not dump.exists():
							dump.write_text(y)
							print("dumped")
					raise
				(s,e) = match.span()
				y = y[:s] + str(output) + y[e:]
			except:
				print(f"... evaluating {p}")
				raise
		else:
			break
	return y

if "dump_file" in cfg:
	Path(cfg["dump_file"]).unlink(missing_ok=True)

if "clear_output" in cfg and cfg["clear_output"]:
	cmd = f"rm -rf {out_dir}/*"
	print(cmd)
	system(cmd)

if "pre_build" in cfg:
	exec(cfg["pre_build"])

for p in sources.keys():
	no_render = False
	for exclude in cfg["exclude_render"]:
		if re.match(exclude, p) :
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

if "post_build" in cfg:
	exec(cfg["post_build"])
