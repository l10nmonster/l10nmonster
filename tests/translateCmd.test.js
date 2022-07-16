import { translateWithEntry } from '../src/translateCmd.js';

const dummyEncodeString = (p) => (typeof p === 'object' ? p.v : p);

const nsrc1 = [
        {
            "t": "bx",
            "v": "<strike>"
        },
        {
            "t": "x",
            "v": "%1$s"
        },
        {
            "t": "ex",
            "v": "</strike>"
        },
        " • ",
        {
            "t": "bx",
            "v": "<color name=\"green\">"
        },
        {
            "t": "x",
            "v": "%2$s"
        },
        " for ",
        {
            "t": "x",
            "v": "%3$s"
        },
        " night",
        {
            "t": "ex",
            "v": "</color>"
        }
    ],
    entry1 = {
        ntgt: [
            {
                "t": "bx",
                "v": "<strike>",
                "v1": "a_bx_strike"
            },
            {
                "t": "x",
                "v": "%1$s",
                "v1": "b_x_1"
            },
            {
                "t": "ex",
                "v": "</strike>",
                "v1": "c_ex_strike"
            },
            " • ",
            {
                "t": "bx",
                "v": "<color name=\"green\">",
                "v1": "d_bx_color"
            },
            " ",
            {
                "t": "x",
                "v": "%3$s",
                "v1": "f_x_3"
            },
            " 1",
            {
                "t": "x",
                "v": "%2$s",
                "v1": "e_x_2"
            },
            "泊分",
            {
                "t": "ex",
                "v": "</color>",
                "v1": "g_ex_color"
            }
        ]
    };

describe ('translateCmd tests', () =>{

  test('simple text translation', async () => {
    expect(translateWithEntry('foo', undefined, { tgt: 'bar' }, {}, dummyEncodeString))
    .toBe('bar');
  });

  test('complex translation', async () => {
    expect(translateWithEntry(undefined, nsrc1, entry1, {}, dummyEncodeString))
    .toBe('<strike>%1$s</strike> • <color name="green"> %3$s 1%2$s泊分</color>');
  });

});
