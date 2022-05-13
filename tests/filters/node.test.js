import * as node from '../../filters/node';

describe('node filter tests', () => {

    const resourceFilter = new node.NodeFilter();
        test('parseResource returns raw parsed resource for simple string', async () => {
          const input = {
            "homeSubtitle": "Book the trip you've been waiting for.",
            "@homeSubtitle": {
              "description": "header - This is the welcome message subtitle on the home page"
            }
          }
          const expectedOutput = {
            "segments":[
              {
                "sid": "homeSubtitle",
                "str": "Book the trip you've been waiting for.",
                "notes": "header - This is the welcome message subtitle on the home page"
              }
            ]
          };
          const output = await resourceFilter.parseResource(input);
          expect(output).toMatchObject(expectedOutput);
        });
        
        test('parseResource returns raw parsed resource for nested strings', async () => {
          const input = {
            "flightHome": { 
              "title": "<strong>Welcome back</strong> to travel.",
              "@title": { "description": "header - welcome message of flight flow" },
          
              "subtitle": "Book the trip you've been waiting for.",
              "@subtitle": { "description": "subtitle - flight landing page subheading"}
            },
          };
          const expectedOutput = {
            "segments":[
              {
                "notes": "header - welcome message of flight flow",
                "sid": "flightHome.title",
                "str": "<strong>Welcome back</strong> to travel.",      
              },
              {
                "notes": "subtitle - flight landing page subheading",
                "sid": "flightHome.subtitle",
                "str": "Book the trip you've been waiting for.",
              }
            ]
          };
          const output = await resourceFilter.parseResource(input);
          expect(output).toMatchObject(expectedOutput);
        });

        test('parseResource returns raw parsed resource for plural', async () => {
          const input = {
            "timeCount": {
              "day_one": "{{count}} day",
              "@day_one": { "description": "copy - time copy for day singular" },
          
              "day_other": "{{count}} days",
              "@day_other": { "description": "copy - time copy for days plural" }
            },
          };
          const expectedOutput =   {
            "segments": [
              {
                "sid": "timeCount.day_one",
                "str": "{{count}} day",
                "isSuffixPluralized": true,
                "notes": "copy - time copy for day singular"
              },
              {
                "sid": "timeCount.day_other",
                "str": "{{count}} days",
                "isSuffixPluralized": true,
                "notes": "copy - time copy for days plural"
              }
            ]
          };
          const output = await resourceFilter.parseResource(input);
          expect(output).toMatchObject(expectedOutput);
        });

});