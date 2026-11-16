"""Prepare local, deterministic ZIP artifacts and SHA-256 checksums; never publish."""
import argparse
import hashlib
import pathlib
import platform
import re
import shutil
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
version = re.search(r'#define QODE_VERSION "([^"]+)"', (ROOT/'include/qode.h').read_text())[1]
output = ROOT/'work/release'; output.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--web-only', action='store_true')
args = parser.parse_args()
stage = output/'stage'
if not args.web_only:
    if stage.exists():
        shutil.rmtree(stage)
    subprocess.run(['cmake', '--install', str(ROOT/'build/native'), '--prefix', str(stage), '--config', 'Release'], check=True)
    shutil.copy2(ROOT/'LICENSE', stage/'LICENSE')
    shutil.copy2(ROOT/'README.md', stage/'README.md')
    shutil.copytree(ROOT/'examples', stage/'examples', dirs_exist_ok=True)
    shutil.copytree(ROOT/'docs', stage/'docs', dirs_exist_ok=True)
    (stage/'INSTALL.txt').write_text('Run bin/qode (Windows: bin/qode.exe) with examples/bell.qc.\nExample: ./bin/qode sample examples/bell.qc --shots 1024 --json\nSee docs/EMBEDDING.md for the static library API.\n')

def archive(name, directory):
    target = output/name
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in sorted(directory.rglob('*')):
            if not path.is_file():
                continue
            info = zipfile.ZipInfo(path.relative_to(directory).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100755 if path.stat().st_mode & 0o111 else 0o100644) << 16
            z.writestr(info, path.read_bytes())
    return target
system = {'Darwin': 'macos', 'Windows': 'windows', 'Linux': 'linux'}[platform.system()]
arch = {'aarch64': 'arm64', 'AMD64': 'x86_64'}.get(platform.machine(), platform.machine())
artifacts = [] if args.web_only else [archive(f'qode-{version}-{system}-{arch}.zip', stage)]
web = ROOT/'web/dist'
if (web/'index.html').exists():
    # Include the repository license alongside bundled third-party notices.
    shutil.copy2(ROOT/'LICENSE', web/'LICENSE')
    artifacts.append(archive(f'qode-{version}-playground.zip', web))
if not args.web_only:
    source_stage = output/'source'
    if source_stage.exists():
        shutil.rmtree(source_stage)
    source_stage.mkdir()
    ignored = shutil.ignore_patterns('node_modules', 'dist', 'wasm', '__pycache__', 'test-results', 'playwright-report')
    for folder in ['src', 'include', 'examples', 'tests', 'tools', 'docs', 'web', '.github', '.vscode']:
        shutil.copytree(ROOT/folder, source_stage/folder, ignore=ignored)
    for filename in ['CMakeLists.txt', 'Makefile', 'start.sh', 'LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', '.clang-format', '.editorconfig', '.gitignore']:
        shutil.copy2(ROOT/filename, source_stage/filename)
    artifacts.append(archive(f'qode-{version}-source.zip', source_stage))
checksums = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in artifacts)
(output/'SHA256SUMS.txt').write_text(checksums)
print(checksums)
