precision highp float;
varying vec2 vUv;
uniform vec4 uWeights;
uniform float uTime;
uniform float uNight;
uniform float uAspect;
uniform vec2 uView;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+1.), f.x), f.y);
}
float fbm(vec2 p) {
  float value=0., strength=.5;
  for(int i=0;i<4;i++) {
    value+=strength*noise(p);
    p=mat2(1.6,-1.2,1.2,1.6)*p+9.7;
    strength*=.5;
  }
  return value;
}
float band(float x,float a,float b,float feather) {
  return smoothstep(a-feather,a+feather,x)*(1.-smoothstep(b-feather,b+feather,x));
}
float rect(vec2 p,vec2 lo,vec2 hi,float feather) {
  return band(p.x,lo.x,hi.x,feather)*band(p.y,lo.y,hi.y,feather);
}

// An imagined city, kept low-contrast behind the glazing rather than a specific skyline.
vec3 officeCity(vec2 p) {
  vec3 skyDay=mix(vec3(.84,.88,.89),vec3(.65,.75,.79),smoothstep(.37,1.,p.y));
  vec3 skyNight=mix(vec3(.41,.52,.61),vec3(.20,.30,.40),smoothstep(.37,1.,p.y));
  vec3 c=mix(skyDay,skyNight,uNight);
  float haze=fbm(p*vec2(8.,13.));
  c+=vec3(.035)*haze;
  for(int i=0;i<3;i++) {
    float layer=float(i);
    float cellWidth=.042+layer*.019;
    float cell=floor((p.x+layer*.023)/cellWidth);
    float local=fract((p.x+layer*.023)/cellWidth);
    float roof=.38+hash(vec2(cell,layer+5.))*(.13+layer*.043);
    roof+=step(.83,hash(vec2(cell,layer+45.)))*.055;
    float width=.63+hash(vec2(cell,layer+21.))*.24;
    float silhouette=band(local,.05,width,.012)*(1.-smoothstep(roof,roof+.002,p.y));
    float facadeNoise=hash(vec2(cell,layer+31.));
    vec3 day=vec3(.71,.76,.78)-layer*.055+facadeNoise*.035;
    vec3 night=vec3(.23,.31,.37)-layer*.035+facadeNoise*.023;
    float floors=band(fract((p.y-.2)*(160.+layer*21.)),.18,.58,.08);
    float fins=band(fract(local*7.),.25,.83,.10);
    float occupied=step(.64,hash(vec2(floor(local*6.)+cell*9.,floor(p.y*155.))));
    vec3 building=mix(day,night,uNight);
    building+=vec3(.035,.048,.057)*floors*fins*(1.-uNight);
    building+=vec3(.36,.29,.19)*floors*fins*occupied*uNight;
    building-=.038*smoothstep(.62,.85,local);
    c=mix(c,building,silhouette);
  }
  c=mix(c,mix(vec3(.86,.885,.88),vec3(.31,.41,.47),uNight),.18*(1.-smoothstep(.25,.6,p.y)));
  return c;
}

vec3 interior(vec2 p) {
  float floorY=.37;
  float ceilingY=.875;
  float dusk=clamp(uNight,0.,1.);
  // Large honed-stone panels and fine shadow reveals; no residential beadboard or curtains.
  float stone=fbm(p*vec2(11.,17.));
  vec3 wall=mix(vec3(.83,.835,.82),vec3(.92,.92,.90),smoothstep(floorY,ceilingY,p.y));
  wall+=(stone-.5)*.012;
  float windowBounce=exp(-abs(p.x-.25)*4.5);
  wall+=vec3(.02,.023,.022)*windowBounce;
  wall-=vec3(.10,.10,.09)*exp(-abs(p.x-.862)*60.);
  float joints=exp(-abs(p.x-.534)*1800.)+exp(-abs(p.x-.782)*1800.);
  wall-=joints*.018;
  wall*=mix(vec3(1.),vec3(.68,.69,.69),dusk);

  // Full-height window bank on the left, with an angled reveal and graphite mullions.
  float jamb=.245;
  float opening=1.-smoothstep(jamb-.001,jamb+.001,p.x);
  vec3 glass=officeCity(vec2(p.x*1.25,p.y));
  float reflection=band(p.x+p.y*.17,.07,.17,.026);
  glass+=vec3(.055,.067,.067)*reflection*(1.-dusk*.6);
  float mullions=band(p.x,.061,.065,.0006)+band(p.x,.169,.173,.0006);
  glass=mix(glass,mix(vec3(.25,.30,.32),vec3(.17,.22,.25),dusk),clamp(mullions,0.,1.));
  glass+=vec3(.13)*exp(-abs(p.x-.066)*1900.)*(1.-dusk*.5);
  float transom=band(p.y,.445,.448,.0006);
  glass=mix(glass,mix(vec3(.32,.38,.39),vec3(.16,.21,.24),dusk),transom*.7);
  vec3 color=mix(wall,glass,opening);
  float jambShadow=band(p.x,jamb,jamb+.009,.0007);
  color=mix(color,mix(vec3(.29,.32,.31),vec3(.24,.27,.27),dusk),jambShadow);
  float reveal=band(p.x,jamb+.01,jamb+.032,.001);
  color=mix(color,mix(vec3(.96,.955,.92),vec3(.68,.68,.63),dusk),reveal);

  // Flush walnut storage at the far right is a single quiet architectural mass.
  float walnutMask=smoothstep(.872,.874,p.x);
  float grain=fbm(vec2(p.x*320.,p.y*3.5));
  vec3 walnut=vec3(.345,.30,.245)+(grain-.5)*.025;
  walnut*=mix(vec3(1.),vec3(.72,.74,.76),dusk);
  float doorReveal=exp(-abs(p.x-.981)*1900.);
  walnut-=doorReveal*.085;
  walnut+=vec3(.03,.024,.012)*exp(-abs(p.x-.878)*100.);
  color=mix(color,walnut,walnutMask);
  float insetTrim=band(p.x,.862,.869,.0005);
  color=mix(color,mix(vec3(.31,.33,.32),vec3(.25,.28,.27),dusk),insetTrim);

  // Ceiling setback and concealed linear light, above the existing objects.
  float top=ceilingY+.045*clamp((.25-p.x)/.4,0.,1.);
  float ceilingMask=smoothstep(top,top+.001,p.y);
  vec3 ceiling=mix(vec3(.79,.81,.80),vec3(.90,.91,.89),smoothstep(top,1.05,p.y));
  ceiling*=mix(vec3(1.),vec3(.69,.72,.74),dusk);
  color=mix(color,ceiling,ceilingMask);
  float slot=band(p.y,top-.006,top+.001,.0007);
  color=mix(color,vec3(.19,.225,.23),slot*.88);
  float lightLine=band(p.y,top-.011,top-.007,.0008)*band(p.x,.281,.84,.003);
  vec3 warmWhite=mix(vec3(.98,.975,.93),vec3(.99,.925,.79),dusk);
  color=mix(color,warmWhite,lightLine);
  float wash=exp(-abs(p.y-(top-.022))*26.)*band(p.x,.28,.85,.025);
  color+=warmWhite*wash*mix(.025,.09,dusk);

  // Stone floor with perspective-correct slab joints and restrained glass reflections.
  float floorMask=1.-smoothstep(floorY-.001,floorY+.001,p.y);
  float near=clamp((floorY-p.y)/.35,0.,1.);
  vec3 floorColor=mix(vec3(.74,.765,.756),vec3(.60,.635,.637),near);
  float surfaceNoise=fbm(p*vec2(26.,37.));
  floorColor+=(surfaceNoise-.5)*.014;
  float persp=max(.48-p.y,.035);
  vec2 floorUv=vec2((p.x-.56)/persp,1./persp);
  float jointX=abs(fract(floorUv.x*.58+.25)-.5);
  float jointY=abs(fract(floorUv.y*.47)-.5);
  float grout=1.-smoothstep(.001,.004,min(jointX,jointY));
  floorColor-=grout*.033;
  // Window reflection is blurred and desaturated, never a mirror under the floating room.
  vec2 reflected=vec2(p.x-.20*(floorY-p.y),floorY+(floorY-p.y)*1.35);
  float reflectedWindow=(1.-smoothstep(.22,.33,reflected.x))*exp(-(floorY-p.y)*2.5);
  floorColor=mix(floorColor,officeCity(reflected)*.87,reflectedWindow*.12);
  float daylight=rect(vec2(p.x+p.y*.78,p.y),vec2(.07,.028),vec2(.52,floorY),.012);
  float crossbar=1.-.25*band(p.x+p.y*.78,.275,.29,.009);
  floorColor=mix(floorColor,vec3(.91,.92,.885),daylight*crossbar*.43*(1.-dusk));
  floorColor*=mix(vec3(1.),vec3(.66,.70,.735),dusk);
  color=mix(color,floorColor,floorMask);
  float skirting=band(p.y,floorY+.001,floorY+.006,.001)*step(jamb,p.x);
  color=mix(color,mix(vec3(.48,.51,.50),vec3(.32,.36,.36),dusk),skirting*.65);
  return color;
}

vec3 sky(vec2 p,float horizon,vec3 zenith,vec3 haze) {
  float altitude=clamp((p.y-horizon)/(1.-horizon),0.,1.);
  vec3 c=mix(haze,zenith,pow(altitude,.65));
  float clouds=fbm(vec2(p.x*3.5+uTime*.006,p.y*9.));
  float thin=smoothstep(.50,.77,clouds)*smoothstep(horizon+.045,horizon+.3,p.y);
  c=mix(c,vec3(.96,.951,.92),thin*.3);
  return c;
}

vec3 aurora(vec2 p) {
  vec3 c=mix(vec3(.08,.14,.18),vec3(.025,.055,.09),smoothstep(.25,1.,p.y));
  float milky=fbm(vec2(p.x*4.-p.y*2.,p.y*6.));
  c+=vec3(.09,.095,.12)*pow(milky,3.);
  // Two translucent curtains, with folded vertical filaments rather than solid waves.
  for(int i=0;i<2;i++) {
    float offset=float(i)*1.7;
    float x=p.x+offset;
    float crest=.64+.12*sin(x*3.8+uTime*.09)+.042*sin(x*12.-uTime*.055);
    float height=p.y-crest;
    float folds=fbm(vec2(x*18.+uTime*.05,height*1.4));
    float filament=.5+.5*noise(vec2(x*370.+folds*24.,offset));
    float foot=exp(-abs(height)*80.);
    float curtain=exp(-max(height,0.)*11.)*smoothstep(-.02,.025,height);
    float strength=(foot*.34+curtain*.40)*(.3+.7*folds)*filament;
    strength*=smoothstep(.05,.20,p.y)*(1.-smoothstep(.90,1.05,p.y));
    vec3 light=mix(vec3(.24,.70,.48),vec3(.33,.32,.57),smoothstep(.025,.23,height));
    c+=light*strength*(i==0?1.:.55);
  }
  vec2 starUv=p*vec2(370.,210.);
  vec2 cell=floor(starUv);
  float rnd=hash(cell);
  vec2 center=vec2(hash(cell+5.),hash(cell+17.))*.6+.2;
  float star=1.-smoothstep(.025,.115,length(fract(starUv)-center));
  c+=vec3(.74,.82,.88)*star*step(.982,rnd)*smoothstep(.30,.5,p.y)*(.35+.65*hash(cell+12.));
  float ridge=.15+.028*fbm(vec2(p.x*6.,2.))+.007*sin(p.x*43.);
  c=mix(c,vec3(.022,.049,.063),1.-smoothstep(ridge,ridge+.006,p.y));
  c*=mix(1.,.83,uNight);
  return c;
}

vec3 meadow(vec2 p) {
  float horizon=.45;
  vec3 c=sky(p,horizon,vec3(.62,.73,.76),vec3(.89,.865,.76));
  float sun=exp(-length((p-vec2(.22,.60))*vec2(1.,1.1))*6.);
  c+=vec3(.12,.08,.018)*sun;
  // Distant ridges and fields use progressively richer tones as they approach.
  for(int i=0;i<5;i++) {
    float k=float(i);
    float hill=horizon-k*.047+(fbm(vec2(p.x*(2.3+k*.6)+k*9.,k*2.))-.4)*(.075+k*.015);
    float mask=1.-smoothstep(hill-.004-k*.001,hill+.006,p.y);
    float depth=clamp((hill-p.y)*2.5,0.,1.);
    vec3 distant=mix(vec3(.63,.68,.62),vec3(.40,.46,.30),k/4.);
    vec2 ground=vec2(p.x/(.3+max(hill-p.y,0.)),1./(.17+max(hill-p.y,0.)));
    float fieldNoise=fbm(ground*vec2(12.,6.));
    float cloudShade=fbm(p*vec2(6.,13.)+vec2(2.,uTime*.006));
    vec3 field=mix(distant*vec3(.88,.95,.83),distant*vec3(1.13,1.09,.93),fieldNoise);
    field*=.91+.18*cloudShade;
    float detail=noise(p*vec2(800.,140.)/(.35+max(hill-p.y,0.)));
    field+=(detail-.5)*(.018+k*.009)*(1.-smoothstep(hill-.15,hill-.01,p.y));
    field-=depth*.035;
    c=mix(c,field,mask);
  }
  // Small, irregular seed heads only at the near edge; no decorative floating particles.
  float near=1.-smoothstep(.0,.20,p.y);
  float grass=noise(vec2(p.x*1200.+sin(uTime*.22+p.x*16.)*1.4,p.y*68.));
  c+=vec3(.14,.12,.058)*(grass-.5)*near;
  vec3 evening=c*vec3(.42,.46,.52)+vec3(.032,.016,0.)*sun;
  return mix(c,evening,uNight);
}

vec3 coast(vec2 p) {
  float horizon=.49;
  vec3 c=sky(p,horizon,vec3(.66,.78,.81),vec3(.90,.91,.86));
  float distanceToHorizon=max(horizon-p.y,.001);
  if(p.y<horizon) {
    float depth=clamp(distanceToHorizon/.49,0.,1.);
    vec3 water=mix(vec3(.54,.68,.70),vec3(.235,.405,.445),pow(depth,.6));
    // Perspective-compressed bands: narrow at the horizon, broad at the near edge.
    float z=1./(distanceToHorizon+.035);
    vec2 q=vec2((p.x-.5)*z*1.7,z);
    float swell=sin(q.y*4.1+uTime*.20+fbm(q*.30)*5.);
    float small=fbm(q*vec2(3.,4.)+vec2(uTime*.025,-uTime*.045));
    float ridge=pow(max(swell*.5+.5,0.),10.);
    water+=(small-.48)*.11;
    water+=vec3(.13,.20,.20)*ridge*(.25+small*.7)*depth;
    float reflection=exp(-pow((p.x-.23)/(distanceToHorizon*.43+.018),2.));
    float glitter=smoothstep(.64,.85,small+ridge*.18);
    water+=vec3(.39,.34,.23)*reflection*glitter*(.4+depth);
    float haze=exp(-distanceToHorizon*45.);
    water=mix(water,vec3(.81,.855,.835),haze*.6);
    c=water;
  }
  float sunGlow=exp(-length((p-vec2(.23,.58))*vec2(1.,1.6))*9.);
  c+=vec3(.09,.066,.015)*sunGlow;
  vec3 evening=c*vec3(.36,.45,.54);
  return mix(c,evening,uNight);
}

void main() {
  // Preserve vertical proportions on mobile; restrained view offset adds depth when orbiting.
  vec2 p=vec2((vUv.x-.5)*max(uAspect/1.65,.78)+.5,vUv.y);
  p+=uView;
  vec3 color=vec3(0.);
  if(uWeights.x>.001) color+=interior(p)*uWeights.x;
  if(uWeights.y>.001) color+=aurora(p)*uWeights.y;
  if(uWeights.z>.001) color+=meadow(p)*uWeights.z;
  if(uWeights.w>.001) color+=coast(p)*uWeights.w;
  float vignette=1.-.09*pow(length((vUv-.5)*vec2(1.25,1.)),1.5);
  color*=vignette;
  color+=(hash(gl_FragCoord.xy)-.5)/255.;
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
}
