<template>
  <router-view />
</template>
<style>
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
}

html, body, #app { 
  height: 100%; 
}

html body {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

html body #app {
  max-width: none;
  width: 100%;
  margin: 0;
  padding: 0;
  text-align: initial;
}
</style>