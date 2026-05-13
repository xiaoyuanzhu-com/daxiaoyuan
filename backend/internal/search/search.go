// Package search builds the searchable text used by the schools list filter.
// The search_text column stores a lowercase, space-separated concatenation of:
//   - the school name (Chinese characters)
//   - full pinyin (e.g. "beijingdaxue")
//   - pinyin initials (e.g. "bjdx")
//   - the school id slug (e.g. "pku")
//
// A LIKE '%q%' against that column matches any of those forms.
package search

import (
	"strings"

	"github.com/mozillazg/go-pinyin"
)

// BuildText returns the searchable representation for one school.
// `name` is the Chinese display name; `id` is the slug.
func BuildText(name, id string) string {
	args := pinyin.NewArgs()
	args.Style = pinyin.Normal // plain a-z, no tone marks
	syllables := pinyin.Pinyin(name, args)

	var full strings.Builder
	var initials strings.Builder
	for _, s := range syllables {
		if len(s) == 0 || len(s[0]) == 0 {
			continue
		}
		full.WriteString(s[0])
		initials.WriteByte(s[0][0])
	}

	parts := []string{
		strings.ToLower(name),
		full.String(),
		initials.String(),
		strings.ToLower(id),
	}
	return strings.Join(parts, " ")
}

// Normalize lowercases the user query for LIKE matching.
func Normalize(q string) string {
	return strings.ToLower(strings.TrimSpace(q))
}
