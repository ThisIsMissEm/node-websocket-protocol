release:
	node tools/release.js

publish: release
	npm publish .

test:
	@echo "Running Tests"
	@nodeunit test/*

test-all: test
	@echo "Running All Tests"
	@nodeunit test/*

benchmark: 
	@echo "Running Benchmarks"
	@find -f benchmark/simple/*.js | xargs -n 1 -t node

doc:
	node tools/doctool/doctool.js

GJSLINT = gjslint --unix_mode --strict --nojsdoc

lint:
	@$(GJSLINT) -r lib/ -r test/

.PHONY: release publish test test-all benchmark doc lint
