import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import DashboardSiswaLayout from '../views/siswa/DashboardSiswaLayout.vue'
import DashboardSiswaView from '../views/siswa/DashboardSiswaView.vue'
import DashboardGuruLayout from '../views/guru/DashboardGuruLayout.vue'
import DashboardGuruView from '../views/guru/DashboardGuruView.vue'
import GuruKatalogView from '../views/guru/GuruKatalogView.vue'
import GuruFavoritView from '../views/guru/GuruFavoritView.vue'
import ScanBukuPage from '../views/admin/ScanBukuPage.vue'
import DashboardAdminLayout from '../views/admin/DashboardAdminLayout.vue'
import DashboardAdminView from '../views/admin/DashboardAdminView.vue'
import DataBukuPage from '../views/admin/DataBukuPage.vue'
import DataSiswaPage from '../views/admin/DataSiswaPage.vue'
import DataGuruPage from '@/views/admin/DataGuruPage.vue'
import DataPeminjaman from '@/views/admin/DataPeminjaman.vue'
import PengembalianPage from '@/views/admin/PengembalianPage.vue'
import Denda from '@/views/admin/Denda.vue'
import KategoriBukuPage from '@/views/admin/KategoriBukuPage.vue'
import PengaturanPage from '../views/admin/PengaturanPage.vue'
import AkunAdminPage from '../views/admin/AkunAdminPage.vue'
import RiwayatAktivitas from '@/views/admin/RiwayatAktivitas.vue'
import LaporanPage from '@/views/admin/LaporanPage.vue'

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
      path: '/admin',
      component: DashboardAdminLayout,
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: '',
          name: 'dashboard-admin',
          component: DashboardAdminView
        },
        {
          path: 'pinjam',
          name: 'admin-pinjam',
          component: ScanBukuPage
        },
        {
          path: 'pengembalian',
          name: 'admin-pengembalian',
          component: PengembalianPage
        },
        {
          path: 'data-buku',
          name: 'admin-data-buku',
          component: DataBukuPage
        },
        {
          path: 'kategori-buku',
          name: 'admin-kategori-buku',
            component: KategoriBukuPage
        },
        {
         path: 'data-siswa',
         name: 'admin-data-siswa',
         component: DataSiswaPage
        },
        {
          path: 'data-guru',
          name: 'admin-data-guru',
          component: DataGuruPage
        },
        {
          path: 'data-peminjaman',
          name: 'admin-data-peminjaman',
          component: DataPeminjaman,
        },
        {
          path: 'denda',
          name: 'admin-denda',
          component: Denda,
        },
        {
          path: 'laporan',
          name: 'admin-laporan',
          component: LaporanPage,
        },
        {
          path: 'riwayat',
          name: 'admin-riwayat',
          component: RiwayatAktivitas,
        },
        {
          path: 'pengaturan',
          name: 'admin-pengaturan',
          component: PengaturanPage
        },
        {
          path: 'akun',
          name: 'admin-akun',
          component: AkunAdminPage
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.meta.requiresAuth && !token) {
    next('/')
    return
  }

  if (to.path.startsWith('/admin') && user?.role && user.role !== 'admin') {
    next('/')
    return
  }

  next()
})

export default router