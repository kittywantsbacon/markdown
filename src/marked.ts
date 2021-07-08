/**
 * @license
 *
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 *
 * Copyright (c) 2018, Костя Третяк. (MIT Licensed)
 * https://github.com/ts-stack/markdown
 */

import { BlockLexer } from "./block-lexer.ts";
import {
  DebugReturns,
  LexerReturns,
  Links,
  MarkedOptions,
  SimpleRenderer,
  Token,
  TokenType,
  Parsed
} from "./interfaces.ts";
import { Parser } from "./parser.ts";

export const Marked = {

  /**
   * Setting simple block rule.
   */
  setBlockRule(regexp: RegExp) {
    BlockLexer.simpleRules.push(regexp);

    return this;
  },

  /**
   * Accepts Markdown text and returns an object containing HTML and metadata.
   *
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   */
  parse(src: string, options: MarkedOptions = new MarkedOptions()): Parsed {
    const result = new Parsed();
    try {
      const { tokens, links, meta } = this._callBlockLexer(src, options);
      result.content = this._callParser(tokens, links, options);
      result.meta = meta;
      return result;
    } catch (e) {
      result.content = this._callMe(e, options);
      return result;
    }
  },

  /**
   * Accepts Markdown text and returns object with text in HTML format,
   * tokens and links from `BlockLexer.parser()`.
   *
   * @param src String of markdown source to be compiled.
   * @param options Hash of options. They replace, but do not merge with the default options.
   * If you want the merging, you can to do this via `Marked.setOptions()`.
   */
  debug(
    src: string,
    options: MarkedOptions = new MarkedOptions(),
    renderers: SimpleRenderer[] = [],
  ): DebugReturns {
    const { tokens, links, meta } = this._callBlockLexer(src, options);
    let origin = tokens.slice();
    const parser = new Parser(options);
    parser.simpleRenderers = renderers;
    const result = parser.debug(links, tokens);

    /**
     * Translates a token type into a readable form,
     * and moves `line` field to a first place in a token object.
     */
    origin = origin.map((token) => {
      token.type = (TokenType as any)[token.type] || token.type;

      const line = token.line;
      delete token.line;
      if (line) {
        return { ...{ line }, ...token };
      } else {
        return token;
      }
    });

    return { tokens: origin, links, meta, result};
  },

  _callBlockLexer(
    src: string = "",
    options: MarkedOptions,
  ): LexerReturns {
    if (typeof src != "string") {
      throw new Error(
        `Expected that the 'src' parameter would have a 'string' type, got '${typeof src}'`,
      );
    }

    // Preprocessing.
    src = src
      .replace(/\r\n|\r/g, "\n")
      .replace(/\t/g, "    ")
      .replace(/\u00a0/g, " ")
      .replace(/\u2424/g, "\n")
      .replace(/^ +$/gm, "");

    return BlockLexer.lex(src, options, true);
  },

  _callParser(
    tokens: Token[],
    links: Links,
    options: MarkedOptions,
    renderers: SimpleRenderer[] = []
  ): string {
    if (renderers.length) {
      const parser = new Parser(options);
      parser.simpleRenderers = renderers;
      return parser.parse(links, tokens);
    } else {
      return Parser.parse(tokens, links, options);
    }
  },

  _callMe(err: Error, options: MarkedOptions) {
    err.message +=
      "\nPlease report this to https://github.com/ts-stack/markdown";

    if (options.silent && options.escape) {
      return "<p>An error occured:</p><pre>" +
        options.escape(err.message + "", true) + "</pre>";
    }

    throw err;
  }
};
