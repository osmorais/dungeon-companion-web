import sys, collections
from PIL import Image
src, outdir = sys.argv[1], sys.argv[2]
im=Image.open(src).convert('RGB'); W,H=im.size; px=im.load()
CELL=10.6
NAMES=['cursor-default','cursor-pointer','cursor-disabled','cursor-grab','cursor-grabbing']
SEGS=[(113,348,297,544),(468,630,274,570),(785,974,308,525),(1100,1342,281,571),(1458,1648,317,569)]
def is_bg(c):
    r,g,b=c; return r>150 and b>150 and g<110 and (r-g)>80 and (b-g)>80
for name,(x0,x1,y0,y1) in zip(NAMES,SEGS):
    w,h=x1-x0+1,y1-y0+1
    cw,ch=round(w/CELL),round(h/CELL)
    sx,sy=w/cw,h/ch
    out=Image.new('RGBA',(cw,ch),(0,0,0,0)); op=out.load()
    for j in range(ch):
        for i in range(cw):
            # amostra o miolo da célula (evita bordas/antialias)
            ax,bx=int(x0+i*sx+sx*0.25),int(x0+(i+1)*sx-sx*0.25)
            ay,by=int(y0+j*sy+sy*0.25),int(y0+(j+1)*sy-sy*0.25)
            cnt=collections.Counter()
            for yy in range(ay,by+1):
                for xx in range(ax,bx+1):
                    c=px[xx,yy]
                    cnt['bg' if is_bg(c) else (c[0]//8*8,c[1]//8*8,c[2]//8*8)]+=1
            total=sum(cnt.values())
            if cnt['bg']>=total*0.5: continue
            del cnt['bg']
            col=cnt.most_common(1)[0][0]
            op[i,j]=(*col,255)
    out.save(f'{outdir}/{name}.png')
    print(name, out.size)
