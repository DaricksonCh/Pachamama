import { describe, expect, it } from 'vitest';
import { renderTemplate } from './message-template';

const vars = { name: 'Ana', date: '12.03.2027', time: '19:00', party: 4 };

describe('renderTemplate', () => {
  it('replaces the four variables, every occurrence', () => {
    expect(renderTemplate('Hola {name}, {date} {time} para {party}. {name}!', vars)).toBe(
      'Hola Ana, 12.03.2027 19:00 para 4. Ana!',
    );
  });

  it('leaves unknown placeholders literal', () => {
    expect(renderTemplate('Hola {otra} {name}', vars)).toBe('Hola {otra} Ana');
  });

  it('does not re-expand replaced values', () => {
    expect(renderTemplate('{name}', { ...vars, name: '{time}' })).toBe('{time}');
  });
});
