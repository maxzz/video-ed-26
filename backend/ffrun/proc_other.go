//go:build !windows

package ffrun

import "os/exec"

func hideWindow(cmd *exec.Cmd) {}
