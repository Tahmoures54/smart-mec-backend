import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdown';

describe('markdownToHtml', () => {
  it('escapes HTML then renders headings, lists and bold', () => {
    const html = markdownToHtml(
      '## علت‌ها\n- **واشر سرسیلندر**\n- سنسور\n\n<script>x</script>'
    );
    expect(html).toContain('<h2>علت‌ها</h2>');
    expect(html).toContain('<strong>واشر سرسیلندر</strong>');
    expect(html).toContain('<li>سنسور</li>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
