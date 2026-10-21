#!/usr/bin/env python3
"""Kept for old habits: the card pack is now filled in by the build (node tools/build.mjs) from build/all-cards.json.
This script just runs that build."""
import os, subprocess, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.exit(subprocess.call(['node', os.path.join(root, 'tools', 'build.mjs')]))
