function scan3D(w, h, phi_list, no_theta){
	
	no_theta = 360/no_theta;
	
	var cur_theta = 0,
		ctrls = document.getElementById("ctrls"),
		canvas= document.createElement("canvas"),
		ctx = canvas.getContext('2d'),result,
		matObj = {}, matArr = [], maps = {},
		opts={contrast:70, sharpness:100, minBrightness:30, maxBrightness:150},
		img=new Image;
		
	canvas.width= w;
	canvas.height= h;
	img.onload = draw;
	img.src = phi_list[0]+'_'+cur_theta+".png";
	
	function draw() {
		if(phi_list.length){
			maps[phi_list[0]] = maps[phi_list[0]]||[];
			maps[phi_list[0]].push(chroma());
			cur_theta+=no_theta;
			if(cur_theta>=360){
				phi_list.shift();
				cur_theta = 0;
			}
			i.src = phi_list[0]+'_'+cur_theta+".png";
		}
	}
	
	function chroma() {
		ctx.drawImage(img, 0, 0,w,h);
		var data = ctx.getImageData(0, 0,w,h);
		var len = w * h,
		out = true, s = [],e = [];
		for (i=0; i<len*4; i+=4) {
			if ( isBG(data.data[i], data.data[i+1], data.data[i+2]) ){
				data.data[i+3] = 0;
				if(!out) {
					e.unshift({x:((i/4-1)%w)-w/2, y:-Math.ceil(((i/4-1)/w)-1)+h/2});
					out = true;
				}
			}
			else if(out){
				s.push({x:((i/4)%w)-w/2, y:-Math.ceil(((i/4)/w)-1)+h/2});
				out = false;
			}
		}
		return s.concat(e);
	}
	
	function isBG(r,g,b){
		if(g>r+opts.contrast && g>b+opts.contrast && r-b<opts.sharpness )
			return (Math.max(r,b)<opts.maxBrightness &&  Math.min(r,b)>opts.minBrightness);
		return false;
	}
	
	function path(shp, theta, phi) {
		var shp=new THREE.Path(shp).toShapes(),
			m = new THREE.Mesh(new THREE.ExtrudeGeometry(shp,{amount:extrudeLength(phi,theta),bevelEnabled:false}));
		m.geometry.center();
		m.rotation.set(phi*Math.PI/180,theta*Math.PI/180,0);
		var bsp = new ThreeBSP(m);
		result = result ? bsp.intersect(result) : bsp;
		matObj[phi] = matObj[phi]||[];
		matObj[phi].push(new THREE.MeshLambertMaterial({ shading: THREE.SmoothShading, map: THREE.ImageUtils.loadTexture(''+phi+'_'+theta+'.PNG')}));
	}
	
	function extrudeLength(phi,theta){
		var map=maps[((+phi+180)%180).toString()];
		theta*=map.length/360;
		bounds=map[theta].reduce(function(t,c){
			return {max:Math.max(t.max,c.y), min:Math.min(t.min,c.y)};
		},{max:0,min:100000});
		return bounds.max-bounds.min;
	}
	
	function texture(g){
		g.faces.forEach(function(face){
			phi=Math.acos(face.normal.y)/Math.PI*180;
			theta=0;
			if(phi!=0&&phi!=180) {
				theta=Math.acos(face.normal.z/Math.sin(phi))/Math.PI*180;
				if(face.normal.x<0) theta=360-theta;
			}
			matArr.push(matObj[phi.toString()][theta/no_theta]);
			var a = g.vertices[face.a],
				b = g.vertices[face.b],
				c = g.vertices[face.c];
			g.faceVertexUvs[0].push([
				new THREE.Vector2(a.x, a.y),
				new THREE.Vector2(b.x, b.y),
				new THREE.Vector2(c.x, c.y)
			]);
		});
	}

	
}


scan3D();

var renderer = new THREE.WebGLRenderer({antialias: true}),
	scene = new THREE.Scene(),
	cameras = [
		new THREE.OrthographicCamera(-canvas.width,canvas.width,-canvas.height,canvas.height,1,1000),
		new THREE.PerspectiveCamera(30,canvas.width/canvas.height,1,1000),
	],
	meshMaterial = [
		new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false }),
		new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
		new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: false }),
		new THREE.MeshNormalMaterial({ wireframe: false }),
		new THREE.MeshLambertMaterial({ shading: THREE.SmoothShading, map: THREE.ImageUtils.loadTexture('me.jpg') }),
		new THREE.MeshLambertMaterial({ shading: THREE.SmoothShading, map: THREE.ImageUtils.loadTexture('khoders.PNG') })
	],
	light = [
		new THREE.DirectionalLight( 0xffffff ),
		new THREE.SpotLight( 0xffffff )
	],
	
	plane = new THREE.Mesh(new THREE.PlaneGeometry(60,60), meshMaterial[0]);
	
renderer.setSize(canvas.width, canvas.height);
renderer.shadowMapEnabled = true;
document.getElementById('output').appendChild(renderer.domElement);

cameras.forEach(function(camera){
	camera.position.set(0,0,100);
	camera.lookAt(scene.position);
	scene.add(camera);
});

light[1].position.set(-40,60,-10).normalize();
light[1].castShadow=true;
scene.add(light[1]);

plane.rotation.x=-0.5*Math.PI;
plane.position.y = -5;
plane.receiveShadow=true;

scene.add(plane);

controls = new THREE.TrackballControls(cameras[1]);
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 0.2;
controls.panSpeed = 0.8;
controls.noZoom = false;
controls.noPan = false;
controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;

function render() {
	requestAnimationFrame(render);
	controls.update();
	renderer.render(scene, cameras[1]);
};

window.onload=function(){
	
	scene.add(new THREE.AxisHelper(100));
		
	for(phi in maps){
		phi = maps[phi];
		for(var i=0,j=0,t=360/phi.length; i<360; i+=t,j++){
			path(phi[j],i,phi-90);
		}
	}
	
	result = result.toMesh(meshMaterial[3]);
	result.geometry.computeVertexNormals();
	result.castShadow=true;
	scene.add(result);
	render();
	
}

