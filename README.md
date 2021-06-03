<h1 align="center">Grater</h1>

<p align="center"><img width="60%" src="https://user-images.githubusercontent.com/17287124/120586137-8cecc400-c465-11eb-9557-7124f2eb628d.png"/></p>


Grater is an [ECMAScript](https://tc39.es/ecma262/index.html) abstract syntax trees (AST) Parser, according to [The ESTree Spec](https://github.com/estree/estree)


> What is an Abstract syntax tree (AST)?
> 
> Abstract syntax trees are [data structures](https://en.wikipedia.org/wiki/Data_structure) widely used in [compilers](https://en.wikipedia.org/wiki/Compiler), due to their property of representing the structure of program code. An AST is usually the result of the [syntax analysis](https://en.wikipedia.org/wiki/Parsing) phase of a compiler.


🚧  **Work in progress**

It's too early to release the source files to the public, but get a taste of it. [Here](https://nanyang24.github.io/Grater)

## 📝 Feature To-Do List
 - ES5
    - RegularExpressionLiteral
    - HoistableDeclaration
    - LabelStatement
 - ES6/ES2015 & More ES Feature
 - Scope
 - JSX Expressions
 - More test cases covered & running [Test262](https://github.com/tc39/test262)
 - Support TC39 proposals via options

## 💡 What the Grater can be used for?
1. Parse Javascript
2. Syntax checker
3. Lint
4. Convert the syntax of different ECMA versions
5. Global API for performing AST operations and tree walkers

## Install

```bash
# yarn
yarn add grater

# npm
npm install grater
```

## Usage

```js
import { parseScript } from 'grater';

parseScript(`

Array.prototype.customReduce = function (fn, initialValue) {
  // fn(acc, cur, ?index, ?originArray)

  var sourceArray = this;
  var acc, currentIndex

  if(initialValue) {
    acc = initialValue
    currentIndex = 0
  } else {
    acc = sourceArray[0]
    currentIndex = 1
  }

  while(currentIndex < sourceArray.length) {
    var currentValue = sourceArray[currentIndex]
    acc = fn(acc, currentValue, currentIndex, sourceArray)
    currentIndex ++
  }

  return acc;
};

`);

```

AST in JSON

```js
{
  "type": "Program",
  "sourceType": "script",
  "body": [
    {
      "type": "ExpressionStatement",
      "expression": {
        "type": "AssignmentExpression",
        "left": {
          "type": "MemberExpression",
          "object": {
            "type": "MemberExpression",
            "object": {
              "type": "Identifier",
              "name": "Array"
            },
            "computed": false,
            "property": {
              "type": "Identifier",
              "name": "prototype"
            }
          },
          "computed": false,
          "property": {
            "type": "Identifier",
            "name": "customReduce"
          }
        },
        "operator": "=",
        "right": {
          "type": "FunctionExpression",
          "id": null,
          "params": [
            {
              "type": "Identifier",
              "name": "fn"
            },
            {
              "type": "Identifier",
              "name": "initialValue"
            }
          ],
          "body": {
            "type": "BlockStatement",
            "body": [
              {
                "type": "VariableDeclaration",
                "kind": "var",
                "declarations": [
                  {
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": "sourceArray"
                    },
                    "init": {
                      "type": "ThisExpression"
                    }
                  }
                ]
              },
              {
                "type": "VariableDeclaration",
                "kind": "var",
                "declarations": [
                  {
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": "acc"
                    },
                    "init": null
                  },
                  {
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": "currentIndex"
                    },
                    "init": null
                  }
                ]
              },
              {
                "type": "IfStatement",
                "test": {
                  "type": "Identifier",
                  "name": "initialValue"
                },
                "consequent": {
                  "type": "BlockStatement",
                  "body": [
                    {
                      "type": "ExpressionStatement",
                      "expression": {
                        "type": "AssignmentExpression",
                        "left": {
                          "type": "Identifier",
                          "name": "acc"
                        },
                        "operator": "=",
                        "right": {
                          "type": "Identifier",
                          "name": "initialValue"
                        }
                      }
                    },
                    {
                      "type": "ExpressionStatement",
                      "expression": {
                        "type": "AssignmentExpression",
                        "left": {
                          "type": "Identifier",
                          "name": "currentIndex"
                        },
                        "operator": "=",
                        "right": {
                          "type": "Literal",
                          "value": 0
                        }
                      }
                    }
                  ]
                },
                "alternate": {
                  "type": "BlockStatement",
                  "body": [
                    {
                      "type": "ExpressionStatement",
                      "expression": {
                        "type": "AssignmentExpression",
                        "left": {
                          "type": "Identifier",
                          "name": "acc"
                        },
                        "operator": "=",
                        "right": {
                          "type": "MemberExpression",
                          "object": {
                            "type": "Identifier",
                            "name": "sourceArray"
                          },
                          "computed": true,
                          "property": {
                            "type": "Literal",
                            "value": 0
                          }
                        }
                      }
                    },
                    {
                      "type": "ExpressionStatement",
                      "expression": {
                        "type": "AssignmentExpression",
                        "left": {
                          "type": "Identifier",
                          "name": "currentIndex"
                        },
                        "operator": "=",
                        "right": {
                          "type": "Literal",
                          "value": 1
                        }
                      }
                    }
                  ]
                }
              },
              {
                "type": "WhileStatement",
                "test": {
                  "type": "BinaryExpression",
                  "left": {
                    "type": "Identifier",
                    "name": "currentIndex"
                  },
                  "right": {
                    "type": "MemberExpression",
                    "object": {
                      "type": "Identifier",
                      "name": "sourceArray"
                    },
                    "computed": false,
                    "property": {
                      "type": "Identifier",
                      "name": "length"
                    }
                  },
                  "operator": "<"
                },
                "body": {
                  "type": "BlockStatement",
                  "body": [
                    {
                      "type": "VariableDeclaration",
                      "kind": "var",
                      "declarations": [
                        {
                          "type": "VariableDeclarator",
                          "id": {
                            "type": "Identifier",
                            "name": "currentValue"
                          },
                          "init": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "Identifier",
                              "name": "sourceArray"
                            },
                            "computed": true,
                            "property": {
                              "type": "Identifier",
                              "name": "currentIndex"
                            }
                          }
                        }
                      ]
                    },
                    {
                      "type": "ExpressionStatement",
                      "expression": {
                        "type": "AssignmentExpression",
                        "left": {
                          "type": "Identifier",
                          "name": "acc"
                        },
                        "operator": "=",
                        "right": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "Identifier",
                            "name": "fn"
                          },
                          "arguments": [
                            {
                              "type": "Identifier",
                              "name": "acc"
                            },
                            {
                              "type": "Identifier",
                              "name": "currentValue"
                            },
                            {
                              "type": "Identifier",
                              "name": "currentIndex"
                            },
                            {
                              "type": "Identifier",
                              "name": "sourceArray"
                            }
                          ]
                        }
                      }
                    },
                    {
                      "type": "ExpressionStatement",
                      "expression": {
                        "type": "UpdateExpression",
                        "argument": {
                          "type": "Identifier",
                          "name": "currentIndex"
                        },
                        "operator": "++",
                        "prefix": false
                      }
                    }
                  ]
                }
              },
              {
                "type": "ReturnStatement",
                "argument": {
                  "type": "Identifier",
                  "name": "acc"
                }
              }
            ]
          },
          "async": false,
          "generator": false
        }
      }
    }
  ]
}
```


## License
[Apache License 2.0](https://github.com/nanyang24/Grater/blob/master/LICENSE)

