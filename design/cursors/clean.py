import sys,glob
from PIL import Image
for f in sorted(glob.glob(sys.argv[1]+'/cursor-*.png')):
    im=Image.open(f).convert('RGBA'); p=im.load(); n=0
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=p[x,y]
            if a and b>=g+35 and r>=g+35:   # tom de magenta/roxo: resto do fundo
                p[x,y]=(0,0,0,0); n+=1
    im.save(f); print(f.split('/')[-1], 'removidos', n)
