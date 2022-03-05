# data-arranger
A Data Arranger for Competitive Programming Debugging

---

## What is this?
This is an easy program for arranging datas for debugging use, especially helpful for competitive programming.

You can test your program, add one more pair(s) of data and configure your settings through only one console.

## How can I use it?

Run `npm i dacu -g` to install.

Usages:

```
# Initialize a directory
dacu init .

# Add a file for a task
dacu add-task test.cpp

# Or specify a task name
# Current language support: cpp, py, js
dacu add-task test2.py pytest

# Add data sets
# Way 1: through stdin (most unstable)
dacu add-data test
# > 1 2
# > 3
# < Success

# Way 2: through external editor (medium stable)
# File-name as task name is allowed
dacu add-data test.cpp --use-editor code

# Way 3: through entry files (most stable)
dacu add-data test.cpp test1.in test1.out

# They can also be mixed up
dacu add-data pytest test2.in --use-editor=code

# Test tasks
# test all tasks
dacu test
# test one/several specified task(s)
dacu test test pytest
# By default, comparisons between answer and output files ignore extra line feeds and blank after each line.
# To disable this, use -s/--strict
dacu test test -s
# For ./test/test.cpp, the result will become WA instead of AC
```

## I found a bug!
It's welcome to issue through Github. Feel free to provide suggestions!

## About more
This project is currently under development so it may not fit many systems or environments well.
