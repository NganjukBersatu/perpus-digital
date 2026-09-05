import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DashboardSiswaLayout from '../views/siswa/DashboardSiswaLayout.vue'
import DashboardSiswaView from '../views/siswa/DashboardSiswaView.vue'
import DashboardGuruLayout from '../views/guru/DashboardGuruLayout.vue'
import DashboardGuruView from '../views/guru/DashboardGuruView.vue'
import GuruKatalogView from '../views/guru/GuruKatalogView.vue'
import GuruFavoritView from '../views/guru/GuruFavoritView.vue'
import ScanBukuPage from '../views/admin/ScanBukuPage.vue'

const ComingSoon = {
  props: {
    title: { type: String, default: 'Halaman' }
  },
  template: `
    <div style="padding:24px">
      <h1 style="margin:0;font-size:22px">{{ title }}</h1>
      <p style="color:#6b7280;margin:8px 0 0">Halaman ini sedang dikembangkan.</p>
    </div>
  `
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/siswa',
      component: DashboardSiswaLayout,
      children: [
        {
          path: '',
          name: 'dashboard-siswa',
          component: DashboardSiswaView
        },
        {
          path: 'katalog',
          name: 'siswa-katalog',
          component: ComingSoon,
          props: { title: 'Katalog Buku' }
        },
        {
          path: 'riwayat',
          name: 'siswa-riwayat',
          component: ComingSoon,
          props: { title: 'Riwayat Pinjam' }
        },
        {
          path: 'profil',
          name: 'siswa-profil',
          component: ComingSoon,
          props: { title: 'Profil' }
        }
      ]
    },
    {
      path: '/guru',
      component: DashboardGuruLayout,
      children: [
        {
          path: '',
          name: 'dashboard-guru',
          component: DashboardGuruView
        },
        {
          path: 'katalog',
          name: 'guru-katalog',
          component: GuruKatalogView
        },
        {
          path: 'favorit',
          name: 'guru-favorit',
          component: GuruFavoritView
        },
        {
          path: 'rekomendasi',
          name: 'guru-rekomendasi',
          component: ComingSoon,
          props: { title: 'Rekomendasi' }
        },
        {
          path: 'peminjaman-saya',
          name: 'guru-peminjaman',
          component: ComingSoon,
          props: { title: 'Peminjaman Saya' }
        },
        {
          path: 'riwayat',
          name: 'guru-riwayat',
          component: ComingSoon,
          props: { title: 'Riwayat Peminjaman' }
        },
        {
          path: 'pengembalian',
          name: 'guru-pengembalian',
          component: ComingSoon,
          props: { title: 'Pengembalian' }
        },
        {
          path: 'notifikasi',
          name: 'guru-notifikasi',
          component: ComingSoon,
          props: { title: 'Notifikasi' }
        },
        {
          path: 'bantuan',
          name: 'guru-bantuan',
          component: ComingSoon,
          props: { title: 'Bantuan' }
        }
      ]
    },
    {
      path: '/admin/pinjam',
      name: 'admin-pinjam',
      component: ScanBukuPage
    }
  ]
})

export default router