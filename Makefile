SHELL := /bin/sh

.DEFAULT_GOAL := help

.PHONY: help install dev build preview clean

help:
	@printf '%s\n' 'Available targets:'
	@printf '  %-10s %s\n' 'install' 'Install npm dependencies'
	@printf '  %-10s %s\n' 'dev' 'Start the Vite dev server'
	@printf '  %-10s %s\n' 'build' 'Type-check and build production assets'
	@printf '  %-10s %s\n' 'preview' 'Preview the production build'
	@printf '  %-10s %s\n' 'clean' 'Remove generated build artifacts'

install:
	npm install

dev:
	npm run dev -- --host 127.0.0.1

build:
	npm run build

preview:
	npm run preview -- --host 127.0.0.1

clean:
	rm -rf dist
