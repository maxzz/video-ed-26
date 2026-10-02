package tools

import "testing"

func TestParseDetectSilence(t *testing.T) {
	stderr := `[silencedetect @ 0x1] silence_start: 1.5
[silencedetect @ 0x1] silence_end: 3.25 | silence_duration: 1.75
[silencedetect @ 0x1] silence_start: 9`
	got := parseDetect(DetectSilence, stderr, 10, 30)
	want := []Range{{11.5, 13.25}, {19, 30}}
	if len(got) != len(want) {
		t.Fatalf("got %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}

func TestParseDetectBlack(t *testing.T) {
	stderr := `[blackdetect @ 0x1] black_start:0 black_end:2.04 black_duration:2.04`
	got := parseDetect(DetectBlack, stderr, 0, 0)
	if len(got) != 1 || got[0] != (Range{0, 2.04}) {
		t.Fatalf("got %v", got)
	}
}
