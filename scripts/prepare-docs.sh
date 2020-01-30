#!/usr/bin/env bash

OUTDIR=docs

rm -rf "$OUTDIR"
echo "generating docs ..."
npx solidity-docgen
echo "generated docs !!"
#echo "running script ..."
#node ./scripts/gen-nav.js "$OUTDIR" > "$OUTDIR/../nav.adoc"
#echo "script success !!"
