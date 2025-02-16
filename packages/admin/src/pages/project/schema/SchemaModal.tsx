import React, { useState } from 'react'
import { useParams, useRequest } from 'umi'
import { useConcent } from 'concent'
import { createSchema, deleteSchema, updateSchema } from '@/services/schema'
import { Modal, Form, message, Input, Space, Button, Checkbox, Typography } from 'antd'

const { TextArea } = Input

export const SchemaModal: React.FC<{
  visible: boolean
  schema?: SchemaV2 | null
  onClose: () => void
  action?: 'edit' | 'create'
}> = ({ visible, onClose, action, schema }) => {
  const { projectId } = useParams<any>()
  const ctx = useConcent('schema')

  // 创建/更新模型
  const { run, loading } = useRequest(
    async (data: SchemaV2) => {
      const { displayName, collectionName, description } = data

      if (action === 'create') {
        await createSchema(projectId, {
          displayName,
          collectionName,
          description,
        })
      }

      if (schema && action === 'edit') {
        const diffData = Object.keys(data)
          .filter((key) => schema[key] !== data[key])
          .reduce(
            (ret, key) => ({
              ...ret,
              [key]: data[key],
            }),
            {}
          )

        await updateSchema(projectId, schema?._id, diffData)
      }

      onClose()
      ctx.dispatch('getSchemas', projectId)
    },
    {
      manual: true,
      onError: () => message.error(`${action === 'create' ? '创建' : '更新'}模型失败`),
      onSuccess: () => message.success(`${action === 'create' ? '创建' : '更新'}模型成功`),
    }
  )

  return (
    <Modal
      destroyOnClose
      centered
      footer={null}
      width={600}
      visible={visible}
      onOk={() => onClose()}
      onCancel={() => onClose()}
      title={`${action === 'create' ? '创建' : '更新'}模型`}
    >
      <Form
        name="basic"
        layout="vertical"
        labelAlign="left"
        labelCol={{ span: 6 }}
        initialValues={action === 'edit' ? schema || {} : undefined}
        onFinish={(v: any) => {
          run(v)
        }}
      >
        <Form.Item
          label="展示名称"
          name="displayName"
          rules={[{ required: true, message: '请输入展示名称！' }]}
        >
          <Input placeholder="展示名称，如文章" />
        </Form.Item>

        <Form.Item
          label="数据库名"
          name="collectionName"
          help={
            action === 'edit' && (
              <Typography.Text type="danger">
                更改数据库名会自动重命名原数据库（危险操作！仅管理员可操作！）
              </Typography.Text>
            )
          }
          rules={[
            { required: true, message: '请输入数据库名称！' },
            {
              message: '字段名只能使用英文字母、数字、-、_ 等符号',
              pattern: /^[a-z0-9A-Z_-]+$/,
            },
          ]}
        >
          <Input placeholder="数据库名，如 article" />
        </Form.Item>

        <Form.Item label="描述信息" name="description">
          <TextArea placeholder="描述信息，会展示在对应内容的管理页面顶部，可用于内容提示，支持 HTML 片段" />
        </Form.Item>

        <Form.Item>
          <Space size="large" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => onClose()}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {action === 'create' ? '创建' : '更新'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export const DeleteSchemaModal: React.FC<{
  visible: boolean
  onClose: () => void
}> = ({ visible, onClose }) => {
  const { projectId } = useParams<any>()
  const ctx = useConcent('schema')
  const contentCtx = useConcent('content')
  const { currentSchema = {} } = ctx.state
  const [loading, setLoading] = useState(false)
  const [deleteCollection, setDeleteCollection] = useState(false)

  return (
    <Modal
      centered
      destroyOnClose
      title="删除内容模型"
      visible={visible}
      onCancel={() => onClose()}
      okButtonProps={{
        loading,
      }}
      onOk={async () => {
        try {
          setLoading(true)
          await deleteSchema(projectId, currentSchema._id, deleteCollection)
          message.success('删除内容模型成功！')
          ctx.dispatch('getSchemas', projectId)
          contentCtx.dispatch('getContentSchemas', projectId)
        } catch (error) {
          message.error('删除内容模型失败！')
        } finally {
          onClose()
          setLoading(false)
        }
      }}
    >
      <Space direction="vertical">
        <Typography.Text>确认删【{currentSchema?.displayName}】内容模型？</Typography.Text>
        <Checkbox
          checked={deleteCollection}
          onChange={(e) => setDeleteCollection(e.target.checked)}
        >
          同时删除数据表（警告：删除后数据无法找回）
        </Checkbox>
      </Space>
    </Modal>
  )
}
