import yt_dlp
import sys
import os
import re
import time

def sanitize_filename(title):
    """ Remove invalid filename characters. """
    return re.sub(r'[\/:*?"<>|]', '', title)

def download_video(video_url, format_type):
    timestamp = int(time.time())  # Unique identifier
    ydl_opts = {
        'quiet': True,
        'format': 'bestaudio/best' if format_type == "mp3" else 'bestvideo+bestaudio/best',
        'merge_output_format': 'mp4' if format_type == "mp4" else None,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)  # Fetch metadata
        title = sanitize_filename(info.get('title', 'video'))
        video_id = info.get('id', '')
        filename = f"{title}_{timestamp}.{format_type}"
        output_path = os.path.join("downloads", filename)

        ydl_opts['outtmpl'] = output_path
        if format_type == "mp3":
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

    print(output_path)  # Return the correct file path

if __name__ == "__main__":
    video_url = sys.argv[1]
    format_type = sys.argv[2]
    download_video(video_url, format_type)
