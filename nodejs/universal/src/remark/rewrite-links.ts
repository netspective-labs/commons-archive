import { visit } from 'unist-util-visit';

// Adapted from https://github.com/rjanjic/remark-link-rewrite

/**
 * Default replacer.
 * @param url
 */
const defaultReplacer = async (url: string) => url;

/**
 * Replace all matches in a string asynchronously.
 * @param str
 * @param regex
 * @param asyncFn
 * @returns {Promise<*>}
 */
export const replaceAsync = async function (str: any, regex: any, asyncFn: any) {
  const promises: any[] = [];
  str.replace(regex, (match: any, ...args: any[]) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
};

/**
 * Rewrite the URL in a JSX node.
 * @param value
 * @param replacer
 * @returns {Promise<*>}
 */
export const rewriteJSXURL = async (value: any, replacer: any) =>
  replaceAsync(value, /href="(.*?)"/g, async (_: any, url: any) => {
    const newUrl = await replacer(url);
    return `href="${newUrl}"`;
  });

/**
 * Rewrite the URL in a Markdown node.
 * @param options
 * @returns {function(*): Promise<*>}
 */
export function remarkRewriteLinks(options = { replacer: defaultReplacer }) {
  const { replacer } = options;
  return async (tree: any) => {
    const nodes: any[] = [];

    visit(tree, node => {
      if (node.type === 'link') {
        nodes.push(node);
      }
      if (node.type === 'jsx' || node.type === 'html') {
        if (/<a.*>/.test(node.value)) {
          nodes.push(node);
        }
      }
    });

    await Promise.all(
      nodes.map(async node => {
        if (node.type === 'link') {
          node.url = await replacer(node.url);
        }
        if (node.type === 'jsx' || node.type === 'html') {
          node.value = await rewriteJSXURL(node.value, replacer);
        }
      })
    );
    return tree;
  };
}
