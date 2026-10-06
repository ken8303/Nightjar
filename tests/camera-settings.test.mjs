import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {readCameraSettings,saveCameraSettings}=await vite.ssrLoadModule('/lib/camera-settings.ts');
test('camera lens and photo preferences survive reopening without storing session calibration',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 assert.deepEqual(readCameraSettings(storage),{fov:60,showPhotos:true});
 assert.equal(saveCameraSettings({fov:75,showPhotos:false,aligned:true,offset:40},storage),true);
 assert.deepEqual(readCameraSettings(storage),{fov:75,showPhotos:false});
 assert.deepEqual(JSON.parse([...data.values()][0]),{fov:75,showPhotos:false});
});
test('corrupt or unavailable storage safely defaults and invalid fields do not discard valid preferences',()=>{
 for(const value of ['invalid','null','[]','7','{"fov":101,"showPhotos":"false"}','{"fov":29.5}']){
  assert.deepEqual(readCameraSettings({getItem:()=>value}),{fov:60,showPhotos:true});
 }
 assert.deepEqual(readCameraSettings({getItem:()=>'{"fov":30,"showPhotos":false}'}),{fov:30,showPhotos:false});
 assert.deepEqual(readCameraSettings({getItem:()=>'{"fov":200,"showPhotos":false}'}),{fov:60,showPhotos:false});
 assert.deepEqual(readCameraSettings({getItem:()=>{throw Error('Storage blocked')}}),{fov:60,showPhotos:true});
 assert.equal(saveCameraSettings({fov:100,showPhotos:true},{setItem:()=>{throw Error('Quota')}}),false);
 for(const fov of [NaN,Infinity,29,101,45.5])assert.equal(saveCameraSettings({fov,showPhotos:true},{setItem:()=>assert.fail('Invalid value written')}),false);
});


test('older vertical-FOV settings preserve photos without guessing the calibration orientation',()=>{
 const data=new Map([['nightjar-camera-settings-v1',JSON.stringify({fov:90,showPhotos:false})]]);
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 assert.deepEqual(readCameraSettings(storage),{fov:60,showPhotos:false});
 saveCameraSettings({fov:75,showPhotos:true},storage);
 assert.deepEqual(readCameraSettings(storage),{fov:75,showPhotos:true});
 assert.equal(data.has('nightjar-camera-settings-v2'),true);
});
