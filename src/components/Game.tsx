import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { createTerrain } from '../utils/terrain';
import { createBuilding } from '../utils/buildings';
import { createTreesAndNature } from '../utils/nature';
import { PlayerManager } from '../utils/players';
import { NetworkManager } from '../utils/network';

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const networkRef = useRef<NetworkManager | null>(null);
  const playerManagerRef = useRef<PlayerManager | null>(null);
  const [fps, setFps] = useState<number>(0);
  
  // Player movement state
  const movementRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
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
    
    // Setup player manager and network
    const playerManager = new PlayerManager(scene);
    playerManagerRef.current = playerManager;
    
    const network = new NetworkManager();
    networkRef.current = network;
    
    // Connect to network when controls are locked
    controls.addEventListener('lock', () => {
      if (!networkRef.current?.connected) {
        networkRef.current?.connect(playerManager);
      }
    });
    
    // Disconnect from network when controls are unlocked
    controls.addEventListener('unlock', () => {
      // Keep connection active, just unlock controls
    });
    
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
    const buildingPositions: {x: number, z: number}[] = []; // Keep track to avoid overlaps
    
    for (let x = -100; x < 100; x += 30) {
      for (let z = -100; z < 100; z += 30) {
        if (Math.random() > 0.7) {
          // Check for nearby buildings to avoid overlaps
          if (!buildingPositions.some(pos => 
            Math.abs(pos.x - x) < 25 && Math.abs(pos.z - z) < 25)) {
            
            const building = createBuilding(
              Math.random() * 10 + 5,  // height
              Math.random() * 10 + 10, // width
              Math.random() * 10 + 10  // depth
            );
            building.position.set(x, 0, z);
            scene.add(building);
            
            // Record this building's position
            buildingPositions.push({x, z});
          }
        } else if (Math.random() > 0.5) {
          // Check for nearby buildings to avoid overlaps
          if (!buildingPositions.some(pos => 
            Math.abs(pos.x - x) < 15 && Math.abs(pos.z - z) < 15)) {
            
            const natureGroup = createTreesAndNature(x, 0, z);
            scene.add(natureGroup);
          }
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

    // Add city grid roads
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue; // Skip center where main roads already exist
      
      const horizontalRoad = new THREE.Mesh(roadGeometry, roadMaterial);
      horizontalRoad.rotation.x = -Math.PI / 2;
      horizontalRoad.position.set(0, 0.1, i * 100);
      scene.add(horizontalRoad);
      
      const verticalRoad = new THREE.Mesh(roadGeometry, roadMaterial);
      verticalRoad.rotation.x = -Math.PI / 2;
      verticalRoad.rotation.z = Math.PI / 2;
      verticalRoad.position.set(i * 100, 0.1, 0);
      scene.add(verticalRoad);
    }
    
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
        case 'ShiftLeft':
          movementRef.current.sprint = true;
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
        case 'ShiftLeft':
          movementRef.current.sprint = false;
          break;
      }
    };
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Animation loop
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const clock = new THREE.Clock();
    let lastFpsUpdate = 0;
    let frameCount = 0;
    
    const animate = () => {
      const delta = clock.getDelta();
      frameCount++;
      
      // Update FPS counter every second
      if (clock.getElapsedTime() - lastFpsUpdate >= 1) {
        setFps(Math.round(frameCount / (clock.getElapsedTime() - lastFpsUpdate)));
        lastFpsUpdate = clock.getElapsedTime();
        frameCount = 0;
      }
      
      requestAnimationFrame(animate);
      
      if (controlsRef.current?.isLocked && cameraRef.current) {
        // Update movement
        const baseSpeed = movementRef.current.sprint ? 0.3 : 0.15;
        
        direction.z = Number(movementRef.current.forward) - Number(movementRef.current.backward);
        direction.x = Number(movementRef.current.right) - Number(movementRef.current.left);
        direction.normalize();
        
        if (movementRef.current.forward || movementRef.current.backward) {
          velocity.z = -direction.z * baseSpeed;
        } else {
          velocity.z = 0;
        }
        
        if (movementRef.current.left || movementRef.current.right) {
          velocity.x = -direction.x * baseSpeed;
        } else {
          velocity.x = 0;
        }
        
        controlsRef.current.moveRight(-velocity.x);
        controlsRef.current.moveForward(-velocity.z);
        
        // Send position update to network
        if (networkRef.current?.connected) {
          networkRef.current.updatePlayerPosition(
            controlsRef.current.getObject().position,
            new THREE.Euler(0, cameraRef.current.rotation.y, 0, 'YXZ')
          );
        }
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
      
      // Disconnect network
      networkRef.current?.disconnect();
      
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
        <p>Shift to sprint</p>
        <p className="text-sm mt-2">FPS: {fps}</p>
      </div>
      
      {!controlsRef.current?.isLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-black/70 p-6 rounded-lg max-w-sm">
            <h2 className="text-xl font-bold mb-4">Click to explore the world</h2>
            <p className="mb-2">Use W, A, S, D keys to move</p>
            <p>Move your mouse to look around</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
