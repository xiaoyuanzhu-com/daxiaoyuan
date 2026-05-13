package search

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildText(t *testing.T) {
	txt := BuildText("北京大学", "PKU")
	// Chinese name preserved (lowercased for non-Han is a no-op):
	assert.Contains(t, txt, "北京大学")
	// Full pinyin (concatenated, no spaces):
	assert.Contains(t, txt, "beijingdaxue")
	// Pinyin initials:
	assert.Contains(t, txt, "bjdx")
	// Id lowercased:
	assert.Contains(t, txt, "pku")
	// All parts are space-separated; no uppercase leaks through:
	assert.Equal(t, strings.ToLower(txt), txt)
}

func TestBuildText_MatchesPartialQueries(t *testing.T) {
	txt := BuildText("北京大学", "pku")
	for _, q := range []string{"北", "bei", "pku", "bjdx", "jingda", "BEI", " PKU "} {
		assert.Contains(t, txt, Normalize(q), "query %q should match", q)
	}
}
