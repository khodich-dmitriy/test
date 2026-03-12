import { AppLanguage } from '@/src/shared/i18n/config';

export const resources = {
  ru: {
    translation: {
      header: {
        brand: 'Вывод средств',
        language: 'Язык',
        theme: 'Тема',
        logout: 'Выйти',
        themes: {
          fintech: 'Светлая',
          ocean: 'Океан',
          mint: 'Мята'
        }
      },
      footer: {
        title: 'Вывод средств',
        description: 'Безопасная работа с заявками и историей операций.',
        support: 'Поддержка',
        supportDescription: 'Статусы обновляются автоматически, детали доступны в карточке заявки.'
      },
      home: {
        title: 'Кабинет вывода средств',
        text: 'Создавайте и отслеживайте заявки на вывод USDT в одном месте.',
        action: 'Открыть форму вывода'
      },
      login: {
        title: 'Вход',
        hint: 'Тестовый доступ: demo / demo123',
        username: 'Логин',
        password: 'Пароль',
        submit: 'Войти',
        submitting: 'Входим...',
        errors: {
          usernameRequired: 'Введите логин',
          passwordRequired: 'Введите пароль',
          failed: 'Не удалось выполнить вход',
          network: 'Ошибка сети. Повторите попытку.'
        }
      },
      stub: {
        eyebrow: 'Временная страница',
        title: 'Эта страница пока недоступна',
        text: 'Корневой маршрут временно ведет сюда, пока готовится финальная стартовая страница.',
        login: 'Открыть вход',
        withdraw: 'Перейти к выводу'
      },
      withdraw: {
        title: 'Вывод средств',
        formState: 'Статус формы: {{status}}',
        formStatus: {
          idle: 'готова',
          loading: 'отправляется',
          success: 'успешно',
          error: 'ошибка'
        },
        amount: 'Сумма',
        destination: 'Кошелек или адрес',
        confirm: 'Подтверждаю заявку на вывод',
        submit: 'Отправить заявку',
        submitting: 'Отправляем...',
        rulesTitle: 'Правила вывода',
        rules: {
          amount: 'Сумма должна быть больше 0.',
          destination: 'Адрес назначения обязателен.',
          confirm: 'Перед отправкой нужно подтвердить заявку.'
        },
        success: {
          title: 'Последняя заявка добавлена в список.',
          text: 'Можно открыть детали сейчас или продолжить работу со списком ниже.',
          action: 'Открыть последнюю заявку'
        },
        error: {
          title: 'Ошибка запроса',
          retry: 'Повторить',
          network: 'Ошибка сети. Проверьте подключение и повторите попытку.',
          conflict: 'Конфликт запроса: заявка с таким ключом идемпотентности уже существует.',
          unauthorized: 'Сессия истекла. Войдите снова.',
          fallback: 'Не удалось выполнить запрос.',
          unknown: 'Непредвиденная ошибка. Повторите попытку.'
        },
        overlay: {
          label: 'Загрузка',
          text: 'Обрабатываем заявку...'
        },
        validation: {
          amountRequired: 'Укажите сумму',
          amountPositive: 'Сумма должна быть больше 0',
          destinationRequired: 'Укажите адрес назначения',
          confirmRequired: 'Подтвердите заявку на вывод'
        },
        feed: {
          title: 'Последние заявки',
          text: 'Новые заявки остаются наверху. Прокрутите список, чтобы загрузить более ранние.',
          loading: 'Загружаем заявки...',
          empty: 'Заявок пока нет.',
          loadingMore: 'Загружаем еще...',
          end: 'Вы дошли до конца списка.',
          region: 'Последние заявки',
          open: 'Открыть',
          delete: 'Удалить',
          deleteLabel: 'Удалить заявку {{id}}',
          modalTitle: 'Удалить заявку',
          modalText: 'Удалить заявку {{id}} из списка? Это действие нельзя отменить.',
          modalCancel: 'Отмена',
          modalDelete: 'Удалить',
          modalDeleting: 'Удаляем...'
        },
        details: {
          title: 'Детали заявки',
          notFound: 'Заявка не найдена',
          amount: 'Сумма: {{amount}}',
          destination: 'Адрес назначения: {{destination}}',
          status: 'Статус:',
          createdAt: 'Создана: {{value}}',
          network: 'Сеть: TRC20',
          settlement: 'Срок обработки: до 15 минут'
        },
        status: {
          pending: 'В ожидании',
          processing: 'В обработке',
          completed: 'Завершено',
          failed: 'Ошибка'
        }
      }
    }
  },
  en: {
    translation: {
      header: {
        brand: 'Withdrawals',
        language: 'Language',
        theme: 'Theme',
        logout: 'Log out',
        themes: {
          fintech: 'Light',
          ocean: 'Ocean',
          mint: 'Mint'
        }
      },
      footer: {
        title: 'Withdrawals',
        description: 'A secure workspace for requests and payout history.',
        support: 'Support',
        supportDescription: 'Statuses update automatically and request details stay available in each card.'
      },
      home: {
        title: 'Withdrawal workspace',
        text: 'Create and track USDT withdrawal requests in one place.',
        action: 'Open withdrawal form'
      },
      login: {
        title: 'Sign in',
        hint: 'Demo access: demo / demo123',
        username: 'Username',
        password: 'Password',
        submit: 'Sign in',
        submitting: 'Signing in...',
        errors: {
          usernameRequired: 'Enter username',
          passwordRequired: 'Enter password',
          failed: 'Sign-in failed',
          network: 'Network error. Please try again.'
        }
      },
      stub: {
        eyebrow: 'Temporary page',
        title: 'This page is not available yet',
        text: 'The root route temporarily points here while the final landing page is being prepared.',
        login: 'Open login',
        withdraw: 'Go to withdrawals'
      },
      withdraw: {
        title: 'Withdraw funds',
        formState: 'Form state: {{status}}',
        formStatus: {
          idle: 'ready',
          loading: 'submitting',
          success: 'success',
          error: 'error'
        },
        amount: 'Amount',
        destination: 'Wallet or address',
        confirm: 'I confirm this withdrawal request',
        submit: 'Submit request',
        submitting: 'Submitting...',
        rulesTitle: 'Withdrawal rules',
        rules: {
          amount: 'Amount must be greater than 0.',
          destination: 'Destination address is required.',
          confirm: 'You must confirm the request before submitting.'
        },
        success: {
          title: 'The latest request has been added to the list.',
          text: 'Open its details now or continue working with the feed below.',
          action: 'Open latest request'
        },
        error: {
          title: 'Request error',
          retry: 'Retry',
          network: 'Network error. Check your connection and try again.',
          conflict: 'Request conflict: a request with this idempotency key already exists.',
          unauthorized: 'Session expired. Please sign in again.',
          fallback: 'Request failed.',
          unknown: 'Unexpected error. Please try again.'
        },
        overlay: {
          label: 'Loading',
          text: 'Processing request...'
        },
        validation: {
          amountRequired: 'Enter amount',
          amountPositive: 'Amount must be greater than 0',
          destinationRequired: 'Enter destination address',
          confirmRequired: 'Confirm the withdrawal request'
        },
        feed: {
          title: 'Recent requests',
          text: 'Newest requests stay at the top. Scroll to load older ones.',
          loading: 'Loading requests...',
          empty: 'No requests yet.',
          loadingMore: 'Loading more...',
          end: 'You have reached the end of the list.',
          region: 'Recent requests',
          open: 'Open',
          delete: 'Delete',
          deleteLabel: 'Delete request {{id}}',
          modalTitle: 'Delete request',
          modalText: 'Delete request {{id}} from the list? This action cannot be undone.',
          modalCancel: 'Cancel',
          modalDelete: 'Delete',
          modalDeleting: 'Deleting...'
        },
        details: {
          title: 'Request details',
          notFound: 'Request not found',
          amount: 'Amount: {{amount}}',
          destination: 'Destination: {{destination}}',
          status: 'Status:',
          createdAt: 'Created: {{value}}',
          network: 'Network: TRC20',
          settlement: 'Processing time: up to 15 minutes'
        },
        status: {
          pending: 'Pending',
          processing: 'Processing',
          completed: 'Completed',
          failed: 'Failed'
        }
      }
    }
  },
  zh: {
    translation: {
      header: {
        brand: '提款',
        language: '语言',
        theme: '主题',
        logout: '退出',
        themes: {
          fintech: '浅色',
          ocean: '海洋',
          mint: '薄荷'
        }
      },
      footer: {
        title: '提款',
        description: '安全处理申请与出款记录。',
        support: '支持',
        supportDescription: '状态会自动更新，每笔申请的详情都可在卡片中查看。'
      },
      home: {
        title: '提款工作台',
        text: '在一个界面中创建并跟踪 USDT 提款申请。',
        action: '打开提款表单'
      },
      login: {
        title: '登录',
        hint: '测试账号: demo / demo123',
        username: '用户名',
        password: '密码',
        submit: '登录',
        submitting: '登录中...',
        errors: {
          usernameRequired: '请输入用户名',
          passwordRequired: '请输入密码',
          failed: '登录失败',
          network: '网络错误，请重试。'
        }
      },
      stub: {
        eyebrow: '临时页面',
        title: '该页面暂时不可用',
        text: '在最终落地页准备完成之前，根路由会暂时跳转到这里。',
        login: '打开登录页',
        withdraw: '前往提款'
      },
      withdraw: {
        title: '提款',
        formState: '表单状态: {{status}}',
        formStatus: {
          idle: '可提交',
          loading: '提交中',
          success: '成功',
          error: '错误'
        },
        amount: '金额',
        destination: '钱包或地址',
        confirm: '我确认这笔提款申请',
        submit: '提交申请',
        submitting: '提交中...',
        rulesTitle: '提款规则',
        rules: {
          amount: '金额必须大于 0。',
          destination: '必须填写目标地址。',
          confirm: '提交前必须确认申请。'
        },
        success: {
          title: '最新申请已加入列表。',
          text: '现在可以打开详情，也可以继续查看下方列表。',
          action: '打开最新申请'
        },
        error: {
          title: '请求错误',
          retry: '重试',
          network: '网络错误，请检查连接后重试。',
          conflict: '请求冲突：该幂等键对应的申请已存在。',
          unauthorized: '会话已过期，请重新登录。',
          fallback: '请求失败。',
          unknown: '发生未知错误，请重试。'
        },
        overlay: {
          label: '加载中',
          text: '正在处理申请...'
        },
        validation: {
          amountRequired: '请输入金额',
          amountPositive: '金额必须大于 0',
          destinationRequired: '请输入目标地址',
          confirmRequired: '请确认提款申请'
        },
        feed: {
          title: '最近申请',
          text: '最新申请会显示在顶部。向下滚动可加载更早的数据。',
          loading: '正在加载申请...',
          empty: '暂无申请。',
          loadingMore: '正在加载更多...',
          end: '已经到底了。',
          region: '最近申请',
          open: '打开',
          delete: '删除',
          deleteLabel: '删除申请 {{id}}',
          modalTitle: '删除申请',
          modalText: '要从列表中删除申请 {{id}} 吗？此操作无法撤销。',
          modalCancel: '取消',
          modalDelete: '删除',
          modalDeleting: '删除中...'
        },
        details: {
          title: '申请详情',
          notFound: '未找到申请',
          amount: '金额: {{amount}}',
          destination: '目标地址: {{destination}}',
          status: '状态:',
          createdAt: '创建时间: {{value}}',
          network: '网络: TRC20',
          settlement: '处理时间: 最长 15 分钟'
        },
        status: {
          pending: '待处理',
          processing: '处理中',
          completed: '已完成',
          failed: '失败'
        }
      }
    }
  }
} as const satisfies Record<AppLanguage, { translation: Record<string, unknown> }>;
