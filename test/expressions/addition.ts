import {pass} from '../tester'
import { Context } from '../../src/parser/type'


describe('Addition', () => {

    pass('+', [
        ['2 + 3', Context.Empty, {
            "type": "Program",
            "sourceType": "script",
            "body": [
              {
                "type": "ExpressionStatement",
                "expression": {
                  "type": "BinaryExpression",
                  "left": {
                    "type": "Literal",
                    "value": 2
                  },
                  "right": {
                    "type": "Literal",
                    "value": 3
                  },
                  "operator": "+"
                }
              }
            ]
          }
        ],
        ['a + b + c', Context.Empty, {
          "type": "Program",
          "sourceType": "script",
          "body": [
            {
              "type": "ExpressionStatement",
              "expression": {
                "type": "BinaryExpression",
                "left": {
                  "type": "BinaryExpression",
                  "left": {
                    "type": "Identifier",
                    "name": "a"
                  },
                  "right": {
                    "type": "Identifier",
                    "name": "b"
                  },
                  "operator": "+"
                },
                "right": {
                  "type": "Identifier",
                  "name": "c"
                },
                "operator": "+"
              }
            }
          ]
        }
        ],
        ['var a = b + c', Context.Empty, {
          "type": "Program",
          "sourceType": "script",
          "body": [
            {
              "type": "VariableDeclaration",
              "kind": "var",
              "declarations": [
                {
                  "type": "VariableDeclarator",
                  "init": {
                    "type": "BinaryExpression",
                    "left": {
                      "type": "Identifier",
                      "name": "b"
                    },
                    "right": {
                      "type": "Identifier",
                      "name": "c"
                    },
                    "operator": "+"
                  },
                  "id": {
                    "type": "Identifier",
                    "name": "a"
                  }
                }
              ]
            }
          ]
        }
        ],
    ])
})