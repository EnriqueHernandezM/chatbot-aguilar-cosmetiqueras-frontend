import React from 'react';

/**
 * Formats WhatsApp-style text:
 * *bold*, _italic_, ~strikethrough~
 * Preserves line breaks and whitespace.
 */
export function formatWhatsAppText(text: string): React.ReactNode[] {
  // Split by newlines first to preserve line breaks
  return text.split('\n').flatMap((line, lineIdx, lines) => {
    const parts: React.ReactNode[] = [];

    // Regex for *bold*, _italic_, ~strikethrough~ (non-greedy, single-line segments)
    const regex = /(\*(.+?)\*)|(_(.+?)_)|(~(.+?)~)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      // Text before this match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      const key = `${lineIdx}-${match.index}`;
      if (match[1]) {
        // *bold*
        parts.push(<strong key={key} className="font-bold">{match[2]}</strong>);
      } else if (match[3]) {
        // _italic_
        parts.push(<em key={key} className="italic">{match[4]}</em>);
      } else if (match[5]) {
        // ~strikethrough~
        parts.push(<s key={key}>{match[6]}</s>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    // Empty line → preserve as line break
    if (parts.length === 0) {
      parts.push('\u00A0'); // non-breaking space to keep blank lines visible
    }

    // Add <br /> between lines (not after last)
    if (lineIdx < lines.length - 1) {
      parts.push(<br key={`br-${lineIdx}`} />);
    }

    return parts;
  });
}
