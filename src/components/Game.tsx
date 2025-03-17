import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { createTerrain } from '../utils/terrain';
import { createBuilding } from '../utils/buildings';
import { createTreesAndNature } from '../utils/nature';

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);
  
  // Player movement state
  const movementRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    speed: 0.15
  });

  useEffect(() => {
    if (!mountRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Add fog for depth perception
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 1.7, 0); // Human eye level
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls
    const controls = new PointerLockControls(camera, document.body);
    controlsRef.current = controls;
    scene.add(controls.getObject());
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    scene.add(sunLight);

    // Generate world
    const terrain = createTerrain();
    scene.add(terrain);
    
    // Generate a small city
    for (let x = -100; x < 100; x += 30) {
      for (let z = -100; z < 100; z += 30) {
        if (Math.random() > 0.7) {
          const building = createBuilding(
            Math.random() * 10 + 5,  // height
            Math.random() * 10 + 10, // width
            Math.random() * 10 + 10  // depth
          );
          building.position.set(x, 0, z);
          scene.add(building);
        } else if (Math.random() > 0.5) {
          const natureGroup = createTreesAndNature(x, 0, z);
          scene.add(natureGroup);
        }
      }
    }

    // Add roads
    const roadGeometry = new THREE.PlaneGeometry(25, 500);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444,
      roughness: 0.8
    });
    const roadH = new THREE.Mesh(roadGeometry, roadMaterial);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.y = 0.1;
    scene.add(roadH);
    
    const roadV = new THREE.Mesh(roadGeometry, roadMaterial);
    roadV.rotation.x = -Math.PI / 2;
    roadV.rotation.z = Math.PI / 2;
    roadV.position.y = 0.1;
    scene.add(roadV);
    
    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    
    // Handle pointer lock
    const onClick = () => {
      controlsRef.current?.lock();
    };
    document.addEventListener('click', onClick);
    
    // Movement controls
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          movementRef.current.forward = true;
          break;
        case 'KeyA':
          movementRef.current.left = true;
          break;
        case 'KeyS':
          movementRef.current.backward = true;
          break;
        case 'KeyD':
          movementRef.current.right = true;
          break;
      }
    };
    
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          movementRef.current.forward = false;
          break;
        case 'KeyA':
          movementRef.current.left = false;
          break;
        case 'KeyS':
          movementRef.current.backward = false;
          break;
        case 'KeyD':
          movementRef.current.right = false;
          break;
      }
    };
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Animation loop
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current?.isLocked) {
        // Update movement
        const speed = movementRef.current.speed;
        
        direction.z = Number(movementRef.current.forward) - Number(movementRef.current.backward);
        direction.x = Number(movementRef.current.right) - Number(movementRef.current.left);
        direction.normalize();
        
        if (movementRef.current.forward || movementRef.current.backward) {
          velocity.z = -direction.z * speed;
        }
        
        if (movementRef.current.left || movementRef.current.right) {
          velocity.x = -direction.x * speed;
        }
        
        controlsRef.current.moveRight(-velocity.x);
        controlsRef.current.moveForward(-velocity.z);
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full h-full" ref={mountRef}>
      <div className="absolute top-5 left-5 bg-black/50 p-3 rounded text-white">
        <h2 className="text-lg font-bold">VirtuWorld</h2>
        <p>W, A, S, D to move</p>
        <p>Mouse to look around</p>
      </div>
    </div>
  );
};

export default Game;
