import { describe, it, expect } from 'vitest';
import { extractCodeBlock } from './extractCode';

describe('extractCodeBlock', () => {
  it('should extract a code block from text', () => {
    const text = `
      Here is some text.
      \`\`\`javascript
      const a = 5;
      console.log(a);
      \`\`\`
      More text here.
    `;
    const expected = `const a = 5;\n      console.log(a);`;
    expect(extractCodeBlock(text)).toBe(expected);
  });

  it('should return the text as is if there is no code block', () => {
    const text = 'This is a text without any code block.';
    expect(extractCodeBlock(text)).toBe(text);
  });

  it('should handle text with multiple code blocks and return the first one', () => {
    const text = `
      \`\`\`python
      print("Hello, World!")
      \`\`\`
      Some text.
      \`\`\`javascript
      console.log("Hello, JavaScript!");
      \`\`\`
    `;
    const expected = `print("Hello, World!")`;
    expect(extractCodeBlock(text)).toBe(expected);
  });

  it('should handle code blocks with no specified language', () => {
    const text = `
      \`\`\`
      No language specified here.
      \`\`\`
    `;
    const expected = `No language specified here.`;
    expect(extractCodeBlock(text)).toBe(expected);
  });

  it('should handle empty code blocks', () => {
    const text = `
      \`\`\`javascript
      \`\`\`
    `;
    const expected = ``;
    expect(extractCodeBlock(text)).toBe(expected);
  });

  it('should handle code blocks with leading and trailing spaces', () => {
    const text = `
      \`\`\`javascript
        const spaced = true;
      \`\`\`
    `;
    const expected = `const spaced = true;`;
    expect(extractCodeBlock(text)).toBe(expected);
  });
});
