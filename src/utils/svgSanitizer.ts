export function sanitizeSvgString(rawSvg: string): string {
  const withoutDoctype = rawSvg
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!ENTITY[^>]*>/gi, '');

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return withoutDoctype
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
      .replace(/<animate\b[^>]*>/gi, '')
      .replace(/<set\b[^>]*>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/(?:xlink:)?href="(?:javascript|vbscript|data:text\/html)[^"]*"/gi, '')
      .replace(/(?:xlink:)?href='(?:javascript|vbscript|data:text\/html)[^']*'/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(withoutDoctype, 'image/svg+xml');

  const parserErrors = doc.querySelectorAll('parsererror');
  if (parserErrors.length > 0) {
    throw new Error('Malformed SVG content');
  }

  const dangerousElements = doc.querySelectorAll(
    'script, foreignObject, animate, set, iframe, object, embed, link, meta, audio, video'
  );
  dangerousElements.forEach((element) => {
    element.remove();
  });

  const allElements = doc.querySelectorAll('*');

  allElements.forEach((element) => {
    const attributeNames = Array.from(element.attributes).map((attr) => attr.name);
    for (const name of attributeNames) {
      const lowerName = name.toLowerCase();
      if (lowerName.startsWith('on')) {
        element.removeAttribute(name);
      } else if (
        lowerName === 'href' ||
        lowerName === 'xlink:href' ||
        lowerName.endsWith(':href')
      ) {
        const val = element.getAttribute(name)?.trim().toLowerCase() ?? '';
        if (
          val.startsWith('javascript:') ||
          val.startsWith('vbscript:') ||
          val.startsWith('data:text/html') ||
          val.startsWith('http:') ||
          val.startsWith('https:') ||
          val.startsWith('//')
        ) {
          element.removeAttribute(name);
        }
      }
    }
  });

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.documentElement);
}
