import yt_dlp
import sys
import os
import re
import time

def sanitize_filename(title):
    """ Remove invalid filename characters. """
    return re.sub(r'[\/:*?"<>|]', '', title)

def download_video(video_url):
    ydl_opts = {
        'format': '270+233',  # Merge best video + audio
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'merge_output_format': 'mp4',
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])


if __name__ == "__main__":
    video_url = sys.argv[1]
    format_type = sys.argv[2]
    download_video(video_url, format_type)
