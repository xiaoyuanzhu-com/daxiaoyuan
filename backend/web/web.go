package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed all:dist
var distFS embed.FS

// RegisterRoutes wires the embedded frontend SPA into the Gin engine. API and
// healthz routes registered before this call take precedence; anything else
// is served from the embedded dist with an index.html fallback for
// client-side routing (BrowserRouter).
func RegisterRoutes(r *gin.Engine) error {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return err
	}
	fileServer := http.FileServer(http.FS(sub))

	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") || p == "/healthz" {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		clean := strings.TrimPrefix(p, "/")
		if clean == "" {
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}
		if _, err := sub.Open(clean); err != nil {
			c.Request.URL.Path = "/"
		}
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
	return nil
}
