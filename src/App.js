/* src/App.js */
import React, { useEffect, useState } from 'react'

import Amplify, { API, graphqlOperation } from 'aws-amplify'
import { createTodo, updateTodo, deleteTodo } from './graphql/mutations'
import { listTodos } from './graphql/queries'

import { Storage, Hub } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';

import { AmplifyS3Image, AmplifyS3Text  } from '@aws-amplify/ui-react/legacy';
import { AmplifyS3ImagePicker, AmplifyS3TextPicker  } from '@aws-amplify/ui-react/legacy';

import '@aws-amplify/ui-react/styles.css';

import awsExports from "./aws-exports";
Amplify.configure(awsExports);

const initialState = { name: '', description: '', image: '' }

const App = () => {
  const [formState, setFormState] = useState(initialState)
  const [todos, setTodos] = useState([])

  useEffect(() => {
    fetchTodos()
  }, [])

  // useEffect(() => {
  //   let message = ""
  //   Hub.listen('storage', (data) => {
  //     const { payload } = data    
  //     const event = payload.event  
  //     //console.log('An upload event has happened - payload.event ', payload.event)       
  //     if (event === 'upload') {
  //       var name = payload.message.split(" ");
  //       message = name[name.length - 1];
  //       console.log('An upload event has happened - payload.message ', payload.message) 
  //       console.log('An upload event has happened - data ', data)    
  //       setInput('image', message)
  //     }
  //   })

  //   //return () => Hub.remove('storage', updateUser) // cleanup
  //   return () => Hub.remove('storage') // cleanup
  // }, [])

  function setInput(key, value) {
    setFormState({ ...formState, [key]: value })
    console.log(key, value)
  }

  async function fetchTodos() {
    try {
      const apiData = await API.graphql({ query: listTodos });
      const todosFromAPI = apiData.data.listTodos.items;
      await Promise.all(todosFromAPI.map(async todo => {
        if (todo.image) {
          const image = await Storage.get(todo.image);
          todo.image = image;
        }
        return todo;
      }))
      setTodos(todosFromAPI);
    } catch (err) { console.log('error fetching todos') }
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description) return      
      if (formState.image) {
        const image = await Storage.get(formState.image);
        formState.image = image;
      }
      const todo = { ...formState }
      setTodos([...todos, todo])
      setFormState(initialState)
      await API.graphql(graphqlOperation(createTodo, { input: todo }))
    } catch (err) {
      console.log('error creating todo:', err)
    }
  }

  async function deleteItem({ id }) {
    console.log('deleteItem - id', id)
    const newTodosArray = todos.filter(todo => todo.id !== id);
    setTodos(newTodosArray);
    await API.graphql({ query: deleteTodo, input: { id } });
  }

  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormState({ ...formState, image: file.name });
    setFormState(initialState)
    await Storage.put(file.name, file);
    fetchTodos();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={styles.container}>
          <h1>Hello {user.username}</h1>
          <input
            onChange={event => setInput('name', event.target.value)}
            style={styles.input}
            value={formState.name}
            placeholder="Name"
          />
          <input
            onChange={event => setInput('description', event.target.value)}
            style={styles.input}
            value={formState.description}
            placeholder="Description"
          />
          <input
            type="file"
            style={styles.input}
            defaultValue={formState.image}
            onChange={onChange}
          />
          <button style={styles.button} onClick={addTodo}>Create Todo</button>
          {
            todos.map((todo, index) => (
              <div key={todo.id ? todo.id : index} style={styles.todo}>
              <p style={styles.todoName}>{todo.id}</p>
                <p style={styles.todoName}>{todo.name}</p>
                <p style={styles.todoDescription}>{todo.description}</p>
                {
                  todo.image && <img src={todo.image} style={{width: 400}} />
                }
              </div>
            ))
          }
          <button style={styles.button} onClick={signOut}>Sign out</button>
        </div>
      )}
    </Authenticator>
  )
}

const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 },
  todo: { marginBottom: 15 },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px', margin: '10px 0px 10px 0px' }
}

export default App