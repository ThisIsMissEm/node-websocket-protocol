release:
	node tools/release.js

publish: release
	npm publish .

test:
	@echo "Running Tests"
	@nodeunit test/simple/*

test-all: test

benchmark: 
	@echo "Running Benchmarks"
	@find -f benchmark/simple/*.js | xargs -n 1 -t node

doc:
	node tools/doctool/doctool.js

lint:
	@gjslint --unix_mode --strict --nojsdoc -r lib/ -r test/

.PHONY: release publish test test-all benchmark doc lint
