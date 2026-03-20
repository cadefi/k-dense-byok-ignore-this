import os
import subprocess

from kady_agent.utils import download_scientific_skills

SANDBOX_DIR = "sandbox"
SANDBOX_VENV = os.path.join(SANDBOX_DIR, ".venv")
SANDBOX_PYPROJECT = os.path.join(SANDBOX_DIR, "pyproject.toml")

_PYPROJECT_TEMPLATE = """\
[project]
name = "kady-sandbox"
version = "0.1.0"
description = "Packages installed by Kady expert agents"
requires-python = ">=3.13"
dependencies = []
"""

os.makedirs(SANDBOX_DIR, exist_ok=True)

if not os.path.isfile(SANDBOX_PYPROJECT):
    print("Seeding sandbox pyproject.toml...")
    with open(SANDBOX_PYPROJECT, "w") as f:
        f.write(_PYPROJECT_TEMPLATE)

if not os.path.isdir(SANDBOX_VENV):
    print("Creating sandbox Python environment...")
    subprocess.run(["uv", "venv", SANDBOX_VENV], check=True)
else:
    print("Sandbox Python environment already exists, skipping creation.")

download_scientific_skills(target_dir="sandbox/.gemini/skills")