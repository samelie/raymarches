// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com

# ifdef GL_ES
precision mediump float;
# endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

uniform sampler2D u_tex0;

const float PI = 3.14159265359;

vec3 lightDirection = normalize(vec3(0.5,0.0,1.0));


float sphereRadius = 0.7;
float cilWidth = 0.7;
float cilHeight = 0.7;

float bumpyFactor = 0.7;

float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}

float sdCapsule( vec3 p, vec3 a, vec3 b, float r )
{
    vec3 pa = p - a, ba = b - a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h ) - r;
}

float sdCappedCylinder( vec3 p, vec2 h )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - h;
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

//**************
// TRANSLATION
//**************

mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

void rX(inout vec3 p, float a) {
	float c,s;vec3 q=p;
	c = cos(a); s = sin(a);
	p.y = c * q.y - s * q.z;
	p.z = s * q.y + c * q.z;
}

void rY(inout vec3 p, float a) {
	float c,s;vec3 q=p;
	c = cos(a); s = sin(a);
	p.x = c * q.x + s * q.z;
	p.z = -s * q.x + c * q.z;
}

void rZ(inout vec3 p, float a) {
	float c,s;vec3 q=p;
	c = cos(a); s = sin(a);
	p.x = c * q.x - s * q.y;
	p.y = s * q.x + c * q.y;
}

vec2 rotate(vec2 pos, float angle){
	float c = cos(angle);
	float s = sin(angle);
	return mat2(c, s, -s, c) * pos;
}

//**************
// COMPOSITION
//**************

float smin( float a, float b, float k )
{
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}


vec3 opRep( inout vec3 p, vec3 c )
{
   return mod(p,c)-0.5*c;
}


float opS( float d1, float d2 )
{
    return max(-d1,d2);
}

float opI( float d1, float d2 )
{
    return max(d1,d2);
}

float opU( float d1, float d2 )
{
    return min(d1,d2);
}


vec2 map(vec3 pos) {
	float capDist = sdCappedCylinder(pos, vec2(cilWidth,cilHeight));
	//pos.y += sin(u_time * 0.02) * 0.5;
	float ballDist = sphere(pos, sphereRadius);
	float smoothed = smin( ballDist, capDist , 0.5);
	//float sub = opU(ballDist, capDist);
	vec3 oldPos = pos;
	//repetition
	pos = opRep(pos,vec3(bumpyFactor, bumpyFactor,bumpyFactor));
	rY(pos, u_time*.2);
	rZ(pos, u_time);
	float bumpy = sphere(pos,0.7) + smoothed;
	//float bumpySphere = opU(ballDist, bumpy);
	//float o = opU(bumpySphere, capDist);
	//float smoothed = smin( bumpy, capDist , 0.5);
	return vec2(bumpy, 0.3);
}

//*************
//LIGHT
//*************

vec3 computeNormal(vec3 pos){
	vec2 eps = vec2(0.01,0.0);

	return normalize(vec3(
		map(pos + eps.xyy).x - map(pos - eps.xyy).x,
		map(pos + eps.yxy).x - map(pos - eps.xyy).x,
		map(pos + eps.yyx).x - map(pos - eps.yyx).x
		));
}

float ambientOclusion( in vec3 pos, in vec3 nor ){
    float occ = 0.0;
    float sca = 1.0;
    for( int i=0; i<5; i++ )
    {
        float hr = 0.01 + 0.06*float(i)/4.0;
        vec3 aopos =  nor * hr + pos;
        float dd = map( aopos ).x;
        occ += -(dd-hr)*sca;
        sca *= 0.95;
    }
    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    
}

float diffuse(vec3 normal){
	return dot(normal, lightDirection) * 0.5 + 0.5;
}

float specular(vec3 normal, vec3 dir){
	vec3 h = normalize(normal - dir);
	return pow(max(dot(h, normal),0.0),100.0);
}

vec3 envLight(vec3 normal, vec3 dir, sampler2D tex) {
    vec3 eye    = -dir;
    vec3 r      = reflect( eye, normal );
    float m     = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
    vec2 vN     = r.xy / m + .5;
    vN.y        = 1.0 - vN.y;
    vec3 color  = texture2D( tex, vN ).rgb;
    float power = 10.0;
    color.r     = pow(color.r, power);
    color       = color.rrr;
    return color;
}

void main() {

	cilWidth = sin(u_time * 1.4) * 0.3;
	cilHeight = sin(u_time * 2.0) * 0.3 + 0.8;
	sphereRadius = sin(u_time * 0.6) * 0.5;

	vec3 pos = vec3(0.0, 0.0, -8.0);
	//vec3 pos = vec3(sin(u_time * 0.2) * 4.0, 2.0 * sin(u_time * 0.4) + 8.0, -10.0);
	vec2 st = gl_FragCoord.xy / u_resolution.xy;
	st = st - vec2(0.5);
	vec3 dir = normalize(vec3(st, 1.0));

	vec3 color = vec3(0.0);

	bool hit = false;
	vec2 mapped;
	for (int i = 0; i < 24; i++) {
		 mapped = map(pos);
		float d = mapped.x;
		if (d < 0.0001) {
			hit = true;
		}
		pos += d * dir;
	}

	if(hit) {
		vec3 normal = computeNormal(pos);
		float _ao = ambientOclusion(pos, normal);
		float diff = diffuse(normal);
		float spec = specular(normal, dir);
		color = 0.3 + 0.3*sin( vec3(0.05,0.08,0.10)*(mapped.y-1.0));
		color += (diff + spec) * normal ; 
		color *= _ao;
		//color += envLight(normal, pos, u_tex0);
	}

	gl_FragColor = vec4(color, 1.0);
}