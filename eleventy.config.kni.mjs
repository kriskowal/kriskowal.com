import {rollup} from 'rollup';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import Story from 'kni/story.js';
import Parser from 'kni/parser.js';
import InlineLexer from 'kni/inline-lexer.js';
import OutlineLexer from 'kni/outline-lexer.js';
import Scanner from 'kni/scanner.js';
import * as Path from 'kni/path.js';
import start from 'kni/grammar.js';
import link from 'kni/link.js';

/**
 * Compiles kni source code to a story states object
 */
const compileKniToStory = (kniSource) => {
  const story = new Story();
  const path = Path.start();
  const base = [];
  
  const p = new Parser(start(story, path, base));
  const il = new InlineLexer(p);
  const ol = new OutlineLexer(il);
  const s = new Scanner(ol, 'input.kni');
  
  // Kick off with a fresh paragraph
  p.next('token', '', '//', s);
  
  s.next(kniSource);
  s.return();
  
  link(story);
  
  if (story.errors.length) {
    throw new Error(`Kni compilation errors: ${story.errors.map(e => e.message || e).join(', ')}`);
  }
  
  return story.states;
};

/**
 * Generates HTML content snippet from story states
 */
const generateHtmlFromStory = async states => {
  // Resolve kni entry.js path
  const kniEntryPath = fileURLToPath(new URL('src/kni-entry.js', import.meta.url));
  
  // Create a virtual story module plugin
  const virtualStoryPlugin = {
    name: 'virtual-story',
    resolveId(id) {
      if (id === 'virtual:story') {
        return id;
      }
      return null;
    },
    load(id) {
      if (id === 'virtual:story') {
        return `export default ${JSON.stringify(states, null, 2)};`;
      }
      return null;
    },
  };

  // Bundle with Rollup
  const bundle = await rollup({
    input: kniEntryPath,
    plugins: [
      virtualStoryPlugin,
      nodeResolve({
        rootDir: dirname(kniEntryPath),
      }),
    ],
    external: [],
  });

  // Generate output
  const {output: outputs} = await bundle.generate({
    format: 'iife',
    name: 'kni',
  });

  const script = outputs[0].code;

  // Return HTML snippet that can be embedded in a layout
  // Includes necessary CSS for kni interactive content
  // Note: entry.js appends frames to document.body, so the styles target body-level elements
  return `\
<style>
  .kni-body {
  }

  .kni-frame {
  }

  .kni-frame-a {
    display: table;
    height: 100%;
    width: 100%;
  }

  .kni-frame-b {
    display: table-cell;
    vertical-align: middle;
    padding: 1em;
    width: 40ex;
  }

  .kni-frame-c {
  }

  .kni-body {
  }

  .kni-frame table {
    border: none;
  }

  .kni-frame th {
    vertical-align: top;
    padding-right: 1ex;
    border: none;
  }

  .kni-frame td {
    vertical-align: top;
    cursor: pointer;
    border: none;
  }

  .kni-frame li {
    list-style-type: decimal;
  }

</style>
<div id="kni-body"></div>
<div class="kni-reset"><a href="#">reset</a></div>
<script>${script}</script>
`;
};

export default eleventyConfig => {
  eleventyConfig.addTemplateFormats("kni");
  
  eleventyConfig.addExtension("kni", {
    outputFileExtension: "html",
    
    compile: async function(inputContent, inputPath) {
      // inputContent already has front matter stripped by Eleventy
      // Compile kni source to story
      const storyStates = compileKniToStory(inputContent);
      
      const htmlContent = await generateHtmlFromStory(storyStates);
      
      // Return render function that uses defaultRenderer to apply layout
      return async function(data) {
        return htmlContent;
        //console.log(data);
        //// data includes front matter and Eleventy's data cascade
        //// Use defaultRenderer to wrap the HTML content in the layout
        // return this.defaultRender(htmlContent, data);
      };
    }
  });
};
