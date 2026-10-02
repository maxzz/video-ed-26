export namespace cutter {
	
	export class TrackMeta {
	    index: number;
	    title: string;
	    language: string;
	
	    static createFrom(source: any = {}) {
	        return new TrackMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.title = source["title"];
	        this.language = source["language"];
	    }
	}
	export class Segment {
	    start: number;
	    end: number;
	    name: string;
	    outputName: string;
	
	    static createFrom(source: any = {}) {
	        return new Segment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.start = source["start"];
	        this.end = source["end"];
	        this.name = source["name"];
	        this.outputName = source["outputName"];
	    }
	}
	export class Request {
	    inputPath: string;
	    outputDir: string;
	    segments: Segment[];
	    mode: string;
	    mergedOutputName: string;
	    streamIndexes: number[];
	    keyframeCut: boolean;
	    smartCut: boolean;
	    avoidNegativeTs: string;
	    preserveMetadata: boolean;
	    preserveChapters: boolean;
	    segmentsToChapters: boolean;
	    movFaststart: boolean;
	    rotation: number;
	    trackMeta: TrackMeta[];
	    overwrite: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Request(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.inputPath = source["inputPath"];
	        this.outputDir = source["outputDir"];
	        this.segments = this.convertValues(source["segments"], Segment);
	        this.mode = source["mode"];
	        this.mergedOutputName = source["mergedOutputName"];
	        this.streamIndexes = source["streamIndexes"];
	        this.keyframeCut = source["keyframeCut"];
	        this.smartCut = source["smartCut"];
	        this.avoidNegativeTs = source["avoidNegativeTs"];
	        this.preserveMetadata = source["preserveMetadata"];
	        this.preserveChapters = source["preserveChapters"];
	        this.segmentsToChapters = source["segmentsToChapters"];
	        this.movFaststart = source["movFaststart"];
	        this.rotation = source["rotation"];
	        this.trackMeta = this.convertValues(source["trackMeta"], TrackMeta);
	        this.overwrite = source["overwrite"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

export namespace dialogs {
	
	export class FileFilter {
	    displayName: string;
	    pattern: string;
	
	    static createFrom(source: any = {}) {
	        return new FileFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.displayName = source["displayName"];
	        this.pattern = source["pattern"];
	    }
	}

}

export namespace ffbin {
	
	export class Status {
	    ffmpegPath: string;
	    ffprobePath: string;
	    ffmpegVersion: string;
	    customDir: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ffmpegPath = source["ffmpegPath"];
	        this.ffprobePath = source["ffprobePath"];
	        this.ffmpegVersion = source["ffmpegVersion"];
	        this.customDir = source["customDir"];
	        this.error = source["error"];
	    }
	}

}

export namespace ffrun {
	
	export class Job {
	    id: string;
	    kind: string;
	    title: string;
	    status: string;
	    progress: number;
	    error: string;
	    result: any;
	
	    static createFrom(source: any = {}) {
	        return new Job(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.kind = source["kind"];
	        this.title = source["title"];
	        this.status = source["status"];
	        this.progress = source["progress"];
	        this.error = source["error"];
	        this.result = source["result"];
	    }
	}

}

export namespace probe {
	
	export class Chapter {
	    id: number;
	    start_time: string;
	    end_time: string;
	    tags: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Chapter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.start_time = source["start_time"];
	        this.end_time = source["end_time"];
	        this.tags = source["tags"];
	    }
	}
	export class Format {
	    filename: string;
	    format_name: string;
	    format_long_name: string;
	    start_time: string;
	    duration: string;
	    size: string;
	    bit_rate: string;
	    nb_streams: number;
	    tags: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Format(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filename = source["filename"];
	        this.format_name = source["format_name"];
	        this.format_long_name = source["format_long_name"];
	        this.start_time = source["start_time"];
	        this.duration = source["duration"];
	        this.size = source["size"];
	        this.bit_rate = source["bit_rate"];
	        this.nb_streams = source["nb_streams"];
	        this.tags = source["tags"];
	    }
	}
	export class SideData {
	    side_data_type: string;
	    rotation: number;
	
	    static createFrom(source: any = {}) {
	        return new SideData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.side_data_type = source["side_data_type"];
	        this.rotation = source["rotation"];
	    }
	}
	export class Stream {
	    index: number;
	    codec_name: string;
	    codec_long_name: string;
	    codec_type: string;
	    codec_tag_string: string;
	    profile: string;
	    width: number;
	    height: number;
	    pix_fmt: string;
	    sample_rate: string;
	    channels: number;
	    channel_layout: string;
	    r_frame_rate: string;
	    avg_frame_rate: string;
	    time_base: string;
	    start_time: string;
	    duration: string;
	    bit_rate: string;
	    nb_frames: string;
	    disposition: Record<string, number>;
	    tags: Record<string, string>;
	    side_data_list?: SideData[];
	    rotation: number;
	    fps: number;
	
	    static createFrom(source: any = {}) {
	        return new Stream(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.codec_name = source["codec_name"];
	        this.codec_long_name = source["codec_long_name"];
	        this.codec_type = source["codec_type"];
	        this.codec_tag_string = source["codec_tag_string"];
	        this.profile = source["profile"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.pix_fmt = source["pix_fmt"];
	        this.sample_rate = source["sample_rate"];
	        this.channels = source["channels"];
	        this.channel_layout = source["channel_layout"];
	        this.r_frame_rate = source["r_frame_rate"];
	        this.avg_frame_rate = source["avg_frame_rate"];
	        this.time_base = source["time_base"];
	        this.start_time = source["start_time"];
	        this.duration = source["duration"];
	        this.bit_rate = source["bit_rate"];
	        this.nb_frames = source["nb_frames"];
	        this.disposition = source["disposition"];
	        this.tags = source["tags"];
	        this.side_data_list = this.convertValues(source["side_data_list"], SideData);
	        this.rotation = source["rotation"];
	        this.fps = source["fps"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Info {
	    path: string;
	    format: Format;
	    streams: Stream[];
	    chapters: Chapter[];
	    duration: number;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.format = this.convertValues(source["format"], Format);
	        this.streams = this.convertValues(source["streams"], Stream);
	        this.chapters = this.convertValues(source["chapters"], Chapter);
	        this.duration = source["duration"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

export namespace thumbs {
	
	export class Thumbnail {
	    time: number;
	    dataUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new Thumbnail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.time = source["time"];
	        this.dataUrl = source["dataUrl"];
	    }
	}

}

export namespace tools {
	
	export class DetectRequest {
	    path: string;
	    kind: string;
	    from: number;
	    to: number;
	    duration: number;
	    blackMinDuration: number;
	    pictureThreshold: number;
	    pixelThreshold: number;
	    silenceNoiseDb: number;
	    silenceMinDuration: number;
	    sceneThreshold: number;
	
	    static createFrom(source: any = {}) {
	        return new DetectRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.kind = source["kind"];
	        this.from = source["from"];
	        this.to = source["to"];
	        this.duration = source["duration"];
	        this.blackMinDuration = source["blackMinDuration"];
	        this.pictureThreshold = source["pictureThreshold"];
	        this.pixelThreshold = source["pixelThreshold"];
	        this.silenceNoiseDb = source["silenceNoiseDb"];
	        this.silenceMinDuration = source["silenceMinDuration"];
	        this.sceneThreshold = source["sceneThreshold"];
	    }
	}
	export class ExtractStream {
	    index: number;
	    codecType: string;
	    codecName: string;
	    language: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtractStream(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.codecType = source["codecType"];
	        this.codecName = source["codecName"];
	        this.language = source["language"];
	    }
	}
	export class MergeRequest {
	    paths: string[];
	    outputPath: string;
	    totalDuration: number;
	    preserveMetadata: boolean;
	    filesToChapters: boolean;
	    durations: number[];
	
	    static createFrom(source: any = {}) {
	        return new MergeRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.paths = source["paths"];
	        this.outputPath = source["outputPath"];
	        this.totalDuration = source["totalDuration"];
	        this.preserveMetadata = source["preserveMetadata"];
	        this.filesToChapters = source["filesToChapters"];
	        this.durations = source["durations"];
	    }
	}

}

