import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DashboardSiswaView from '../views/DashboardSiswaView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardSiswaView
    }
  ]
})

export default router